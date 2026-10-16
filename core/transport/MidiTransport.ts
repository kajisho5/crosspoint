import { buildDt1, buildRq1, parseSysEx, toHex } from '../codec/SysExCodec';
import { addrToHex, type Addr } from '../codec/value';
import { CommandQueue, type QueuedCommand } from '../controller/CommandQueue';
import { PROFILES } from '../profiles';
import type { DeviceProfile } from '../profiles/types';
import type { CrosspointMidi, MidiEndpointInfo } from '@/modules/crosspoint-midi/src';
import {
  LinkFailure,
  type ConnectResult,
  type ConnectTarget,
  type LinkError,
  type LinkState,
  type LogEntry,
  type Transport,
  type TransportKind,
  type Unsub,
} from './Transport';

/**
 * MIDI（USB / Bluetooth 共通）Transport（SPEC §4・§5・§6）。
 * - 書込みは DT1 一括、読出しは RQ1。パケット間 20ms（CommandQueue と ネイティブの両方で保証）
 * - 接続確認（§4-3）：RQ1 版 6byte → 1s 以内の DT1 応答のヘッダ modelId で機種判定
 * - 受信（§4-4）：SysEx 以外は捨てる。接続中プロファイル以外のヘッダは捨てる（接続確認中は全機種可）。チェックサム不一致は破棄
 * - 端点が消えたら onLinkLost → reconnecting。再出現（onEndpointsChanged で同 UniqueID が online）で自動再接続
 * - BLE は連続値 50ms 間隔、ポーリング 300ms 以上（SyncEngine 側は MIDI で 1000ms 下限）
 */

export interface MidiTransportOptions {
  verTimeoutMs?: number;
  /** 再出現を待つ上限（超えたら error LINK_LOST のまま。ユーザー操作で再接続） */
  relinkWaitMs?: number;
}

const DEFAULTS: Required<MidiTransportOptions> = { verTimeoutMs: 1000, relinkWaitMs: 60000 };

export class MidiTransport implements Transport {
  readonly kind: TransportKind;

  private readonly opt: Required<MidiTransportOptions>;
  private queue: CommandQueue;
  private subs: { remove(): void }[] = [];
  private target: ConnectTarget | null = null;
  private profile: DeviceProfile | null = null;
  private up = false;
  private closing = false;
  private state: LinkState = 'idle';
  private verWaiter: { resolve: (r: { profile: DeviceProfile; data: number[] }) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private relinkTimer: ReturnType<typeof setTimeout> | null = null;
  private relinkDeadline = 0;

  private paramCbs = new Set<(a: Addr, bytes: number[]) => void>();
  private stateCbs = new Set<(s: LinkState, err?: LinkError) => void>();
  private logCbs = new Set<(e: LogEntry) => void>();

  constructor(
    private readonly midi: CrosspointMidi,
    kind: 'usb' | 'ble',
    options: MidiTransportOptions = {},
  ) {
    this.kind = kind;
    this.opt = { ...DEFAULTS, ...options };
    this.queue = new CommandQueue((cmd) => this.sendCommand(cmd), { highGapMs: 20, lowBatch: 4, lowBatchGapMs: 20 });
  }

  get linkState(): LinkState {
    return this.state;
  }

  async connect(target: ConnectTarget): Promise<ConnectResult> {
    await this.disconnect();
    this.closing = false;
    this.target = target;
    this.subscribe();
    try {
      return await this.openSession();
    } catch (e) {
      const code = e instanceof LinkFailure ? e.code : 'MIDI_OPEN_FAILED';
      this.emitState('error', code);
      throw e;
    }
  }

  async disconnect(reason?: string): Promise<void> {
    this.closing = true;
    this.clearRelink();
    this.queue.clear();
    this.cancelVerWait();
    for (const s of this.subs) s.remove();
    this.subs = [];
    if (this.up || this.profile) {
      this.log('info', reason ? `切断：${reason}` : '切断');
    }
    this.up = false;
    this.profile = null;
    try {
      await this.midi.close();
    } catch {
      // 既に閉じている
    }
    if (this.state !== 'idle') this.emitState('idle');
  }

  writeParam(a: Addr, bytes: number[]): void {
    if (!this.up) return;
    this.queue.write(a, bytes, bytes.length >= 2);
  }

  readParam(a: Addr, size: number): void {
    if (!this.up) return;
    this.queue.read(a, size);
  }

  /** 診断用：任意の SysEx（F0…F7）をそのまま送る */
  sendRaw(bytes: number[]): void {
    void this.send(bytes);
  }

  on(ev: 'param', cb: (a: Addr, bytes: number[]) => void): Unsub;
  on(ev: 'state', cb: (s: LinkState, err?: LinkError) => void): Unsub;
  on(ev: 'log', cb: (e: LogEntry) => void): Unsub;
  on(ev: 'err', cb: (code: number) => void): Unsub;
  on(ev: 'rtt', cb: (ms: number) => void): Unsub;
  on(ev: 'text', cb: (text: string) => void): Unsub;
  on(ev: 'param' | 'state' | 'log' | 'err' | 'rtt' | 'text', cb: (...args: never[]) => void): Unsub {
    if (ev === 'err' || ev === 'rtt' || ev === 'text') return () => {}; // MIDI は ERR 応答が無い（無応答）。RTT は版読出しで計測しない。簡易制御コマンドも無い
    const set = (ev === 'param' ? this.paramCbs : ev === 'state' ? this.stateCbs : this.logCbs) as Set<(...args: never[]) => void>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }

  // ---- セッション ----------------------------------------------------------

  private subscribe(): void {
    this.subs.push(
      this.midi.addListener('onSysEx', (ev) => this.onSysEx(ev.bytes)),
      this.midi.addListener('onLinkLost', (ev) => this.onLinkLost(ev.uniqueId)),
      this.midi.addListener('onEndpointsChanged', (ev) => this.onEndpointsChanged(ev.endpoints)),
      this.midi.addListener('onLog', (ev) => this.log('info', `[native ${ev.level}] ${ev.msg}`)),
    );
  }

  private async openSession(): Promise<ConnectResult> {
    const target = this.target!;
    const dest = target.midiDestUniqueId ?? 0;
    const src = target.midiSrcUniqueId ?? 0;
    if (!dest) throw new LinkFailure('MIDI_OPEN_FAILED', '端点が未指定');
    this.emitState('connecting');
    this.log('info', `MIDI open dest=${dest} src=${src}（${this.kind.toUpperCase()}）`);
    try {
      await this.midi.open(dest, src);
    } catch (e) {
      throw new LinkFailure('MIDI_OPEN_FAILED', String((e as Error)?.message ?? e));
    }
    this.emitState('authenticating');
    const { profile, data } = await this.requestVersion();
    if (target.model && target.model !== profile.model) {
      await this.midi.close().catch(() => undefined);
      throw new LinkFailure('WRONG_DEVICE', `保存済み ${target.model} ≠ ${profile.model}`);
    }
    this.profile = profile;
    this.up = true;
    const version = formatVersion(data, profile.version.kind);
    this.log('info', `機種 ${profile.model}、版 raw=${toHex(data)} → ${version}`);
    this.emitState('syncing');
    return { model: profile.model, version };
  }

  /** §4-3：RQ1 版 6byte → 1s 以内に DT1 が返ればヘッダの modelId で機種判定 */
  private requestVersion(): Promise<{ profile: DeviceProfile; data: number[] }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.verWaiter = null;
        this.log('info', 'NO_RESPONSE: RQ1 版 無応答（端点違い or 本体設定不備）');
        reject(new LinkFailure('NO_RESPONSE', 'RQ1 版 無応答'));
      }, this.opt.verTimeoutMs);
      this.verWaiter = { resolve, timer };
      // 接続確認中は全対応機種のヘッダを受け付けるため、全機種分の RQ1 を送る（modelId が違えば本体は無応答）
      for (const p of Object.values(PROFILES)) void this.send(buildRq1(p.sysexModelId, p.version.addr, p.version.size));
    });
  }

  private cancelVerWait(): void {
    if (this.verWaiter) {
      clearTimeout(this.verWaiter.timer);
      this.verWaiter = null;
    }
  }

  // ---- 受信 ----------------------------------------------------------------

  private onSysEx(bytes: number[]): void {
    const candidates = this.profile ? [this.profile.sysexModelId] : Object.values(PROFILES).map((p) => p.sysexModelId);
    const parsed = parseSysEx(bytes, candidates);
    if (parsed.kind === 'other') {
      this.log('rx', `? ${toHex(bytes)}（${parsed.reason}）`);
      return;
    }
    if (!parsed.checksumOk) {
      this.log('rx', `✕ checksum ${toHex(bytes)}`);
      return;
    }
    if (parsed.kind === 'rq1') {
      this.log('rx', `RQ1 ${addrToHex(parsed.addr)} ×${parsed.size}（本体からの読出し要求は無視）`);
      return;
    }
    this.log('rx', `DT1 ${addrToHex(parsed.addr)},${parsed.data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('')}`);
    if (this.verWaiter) {
      const profile = Object.values(PROFILES).find((p) => p.sysexModelId.length === parsed.modelId.length && p.sysexModelId.every((b, i) => parsed.modelId[i] === b));
      if (profile && parsed.addr === profile.version.addr) {
        const w = this.verWaiter;
        this.cancelVerWait();
        w.resolve({ profile, data: parsed.data });
        return;
      }
    }
    for (const cb of this.paramCbs) cb(parsed.addr, parsed.data);
  }

  private onLinkLost(uniqueId: number): void {
    if (this.closing || !this.up) return;
    this.up = false;
    this.queue.clear();
    this.log('info', `端点 ${uniqueId} が消えました（${this.kind === 'usb' ? 'USB が外れました' : 'Bluetooth が切れました'}）`);
    this.emitState('reconnecting', 'LINK_LOST');
    this.relinkDeadline = Date.now() + this.opt.relinkWaitMs;
    this.relinkTimer = setTimeout(() => {
      this.relinkTimer = null;
      if (!this.up && !this.closing) this.emitState('error', 'LINK_LOST');
    }, this.opt.relinkWaitMs);
  }

  private onEndpointsChanged(endpoints: MidiEndpointInfo[]): void {
    if (this.closing || this.up || this.state !== 'reconnecting' || !this.target) return;
    if (Date.now() > this.relinkDeadline) return;
    const dest = this.target.midiDestUniqueId;
    const found = endpoints.find((e) => e.uniqueId === dest && e.online);
    if (!found) return;
    this.clearRelink();
    this.log('info', `端点 ${dest} が再出現：再接続します`);
    void this.openSession().catch((e: unknown) => {
      if (this.closing) return;
      const code = e instanceof LinkFailure ? e.code : 'MIDI_OPEN_FAILED';
      this.emitState('error', code);
    });
  }

  private clearRelink(): void {
    if (this.relinkTimer) clearTimeout(this.relinkTimer);
    this.relinkTimer = null;
  }

  // ---- 送信 ----------------------------------------------------------------

  private sendCommand(cmd: QueuedCommand): void {
    const p = this.profile;
    if (!p) return;
    const bytes = cmd.kind === 'write' ? buildDt1(p.sysexModelId, cmd.addr, cmd.bytes) : buildRq1(p.sysexModelId, cmd.addr, cmd.size);
    void this.send(bytes);
  }

  private async send(bytes: number[]): Promise<void> {
    try {
      await this.midi.sendSysEx(bytes);
      this.log('tx', toHex(bytes));
    } catch (e) {
      this.log('info', `送信失敗: ${String((e as Error)?.message ?? e)}`);
    }
  }

  // ---- 共通 ----------------------------------------------------------------

  private emitState(s: LinkState, err?: LinkError): void {
    this.state = s;
    for (const cb of this.stateCbs) cb(s, err);
  }

  private log(dir: LogEntry['dir'], text: string): void {
    const e: LogEntry = { ts: Date.now(), dir, text };
    for (const cb of this.logCbs) cb(e);
  }
}

/**
 * 版の表示。kind='digits'：各バイトが 0–9 の数字（Major / Minor1 / Minor2 / Build…。V-160HD 系・V-8HD・V-02HD MK II）→ "3.60" 形式。
 * kind='ascii'：ASCII 文字列（V-1HD / V-1SDI / VR-4HD）。それ以外・判定できないときは 16 進のまま
 */
export function formatVersion(data: number[], kind: 'digits' | 'ascii' = 'digits'): string {
  if (data.length === 0) return '';
  if (kind === 'digits' && data.every((b) => b <= 9)) {
    const major = data[0] ?? 0;
    const minor = data.slice(1, 3).map((b) => String(b)).join('');
    return minor.length > 0 ? `${major}.${minor}` : String(major);
  }
  const printable = data.every((b) => b >= 0x20 && b <= 0x7e);
  if (printable) return String.fromCharCode(...data).replace(/\0/g, '').trim();
  return data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

/** 端点一覧を「機種名の部分一致 → online → 名前」で並べる（SPEC §5-2：名前の完全一致に依存しない） */
export function rankEndpoints(endpoints: MidiEndpointInfo[], kind: 'usb' | 'ble'): MidiEndpointInfo[] {
  const names: string[] = Object.values(PROFILES).map((p) => p.verName.toLowerCase());
  const score = (e: MidiEndpointInfo) => {
    let s = 0;
    const text = `${e.name} ${e.deviceName}`.toLowerCase();
    if (names.some((n) => text.includes(n))) s += 100;
    if (e.transport === kind) s += 10;
    if (e.online) s += 1;
    return s;
  };
  return [...endpoints].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
