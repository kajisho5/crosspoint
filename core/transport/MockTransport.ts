import { addrOffset, addrToHex, decodeTime, decodeU14, encodeU14, type Addr } from '../codec/value';
import { getProfile } from '../profiles';
import type { DeviceProfile, ModelId } from '../profiles/types';
import { buildDemoState, writeTally, type ByteMap } from './demoState';
import { simulateSimpleCommand } from './simpleCommandSim';
import type {
  ConnectResult,
  ConnectTarget,
  LinkError,
  LinkState,
  LogEntry,
  Transport,
  TransportKind,
  Unsub,
} from './Transport';

/**
 * メモリ上で本体の挙動を再現する Transport（SPEC §12-2、デモモード F11）。
 * 実機への接続処理は一切行わない。ログは LAN 形式（DTH/RQH）の文字列で残す。
 */

type ParamCb = (a: Addr, bytes: number[]) => void;
type StateCb = (s: LinkState, err?: LinkError) => void;
type LogCb = (e: LogEntry) => void;

const DEMO_VERSIONS: Record<ModelId, string> = { 'V-160HD': '3.60', 'V-80HD': '1.30', 'VR-120HD': '2.00', 'VR-6HD': '2.20', 'V-1-4K': '1.00', 'V-8HD': '3.00', 'V-1HD': '2.10', 'V-1SDI': '1.50', 'VR-4HD': '2.10', 'V-02HD-MK2': '1.03', 'V-60HD': '3.10', 'V-600UHD': '3.00', 'VR-50HD-MK2': '2.00' };
const LATENCY_MS = 12;

export class MockTransport implements Transport {
  readonly kind: TransportKind = 'mock';

  private profile: DeviceProfile;
  private mem: ByteMap = new Map();
  private paramCbs = new Set<ParamCb>();
  private stateCbs = new Set<StateCb>();
  private logCbs = new Set<LogCb>();
  private textCbs = new Set<(text: string) => void>();
  private seqOn = false;
  private seqAuto = false;
  private connected = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private pressed = new Set<Addr>();

  constructor(model: ModelId = 'V-160HD') {
    this.profile = getProfile(model);
  }

  async connect(target: ConnectTarget): Promise<ConnectResult> {
    const model = target.model ?? this.profile.model;
    this.profile = getProfile(model);
    this.emitState('connecting');
    this.log('info', `デモ機器 ${target.name}（${model}）に接続`);
    this.emitState('authenticating');
    this.log('tx', 'VER;');
    const version = DEMO_VERSIONS[model];
    this.log('rx', `VER:${this.profile.verName},${version}`);
    this.emitState('syncing');
    this.mem = buildDemoState(this.profile);
    this.connected = true;
    this.emitState('online');
    return { model, version };
  }

  async disconnect(reason?: string): Promise<void> {
    for (const a of this.pressed) this.applyWrite(a, [0]);
    this.pressed.clear();
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.connected = false;
    this.log('info', reason ? `切断：${reason}` : '切断');
    this.emitState('idle');
  }

  writeParam(a: Addr, bytes: number[]): void {
    if (!this.connected) return;
    bytes.forEach((b, i) => {
      this.log('tx', `DTH:${addrToHex(addrOffset(a, i))},${b.toString(16).toUpperCase().padStart(2, '0')};`);
    });
    this.later(() => this.applyWrite(a, bytes));
  }

  readParam(a: Addr, size: number): void {
    if (!this.connected) return;
    this.log('tx', `RQH:${addrToHex(a)},${size.toString(16).toUpperCase().padStart(6, '0')};`);
    this.later(() => this.emitParam(a, this.readBytes(a, size)));
  }

  on(ev: 'param', cb: ParamCb): Unsub;
  on(ev: 'state', cb: StateCb): Unsub;
  on(ev: 'log', cb: LogCb): Unsub;
  on(ev: 'err', cb: (code: number) => void): Unsub;
  on(ev: 'rtt', cb: (ms: number) => void): Unsub;
  on(ev: 'text', cb: (text: string) => void): Unsub;
  on(ev: 'param' | 'state' | 'log' | 'err' | 'rtt' | 'text', cb: ParamCb | StateCb | LogCb | ((n: number) => void) | ((t: string) => void)): Unsub {
    if (ev === 'err' || ev === 'rtt') {
      // モックは ERR を返さず、往復時間も計測しない
      return () => {};
    }
    const set = (ev === 'param' ? this.paramCbs : ev === 'state' ? this.stateCbs : ev === 'text' ? this.textCbs : this.logCbs) as Set<typeof cb>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }

  /** 簡易制御コマンド（LAN/RS-232 簡易制御コマンド Ver.02）を模擬：CUT / ATO / MEM / MCREX / SEQ 系 / TLY / Q 系 */
  sendText(text: string): void {
    if (!this.connected) return;
    this.log('tx', text);
    const reply = simulateSimpleCommand(text, {
      swap: () => this.swapPgmPst(),
      autoMs: () => decodeTime([this.mem.get(this.profile.addrs.transTime) ?? 10]) * 1000,
      later: (fn, ms) => this.later(fn, ms),
      loadMemory: (n) => {
        if (this.profile.addrs.memCurrent != null) this.setBytes(this.profile.addrs.memCurrent, [n - 1]);
      },
      tally: () => {
        const p = this.profile;
        const tb = p.addrs.tallyBlock;
        if (tb == null) return [];
        return Array.from({ length: p.addrs.tallyBlockSize }, (_, i) => this.mem.get(addrOffset(tb, i)) ?? 0);
      },
      seq: { get: () => ({ on: this.seqOn, auto: this.seqAuto }), set: (v) => { if (v.on != null) this.seqOn = v.on; if (v.auto != null) this.seqAuto = v.auto; } },
    });
    this.later(() => {
      for (const line of reply) {
        this.log('rx', line);
        if (line !== 'ACK') for (const cb of this.textCbs) cb(line);
      }
    });
  }

  /** 接続直後の全状態（SyncEngine 相当の初期同期をモックでは一括で渡す） */
  snapshot(): ByteMap {
    return new Map(this.mem);
  }

  private applyWrite(a: Addr, bytes: number[]): void {
    const p = this.profile;
    if (p.addrs.cut != null && a === p.addrs.cut) {
      if (bytes[0] === 1) {
        this.pressed.add(a);
        this.swapPgmPst();
      } else {
        this.pressed.delete(a);
      }
      return;
    }
    if (p.addrs.auto != null && a === p.addrs.auto) {
      if (bytes[0] === 1) {
        const ms = decodeTime([this.mem.get(p.addrs.transTime) ?? 10]) * 1000;
        this.later(() => this.swapPgmPst(), Math.max(ms, LATENCY_MS));
      }
      return;
    }
    if (a === p.addrs.memLoad) {
      if (p.addrs.memCurrent != null) this.setBytes(p.addrs.memCurrent, [bytes[0] ?? 0]);
      return;
    }
    if (p.addrs.memSave != null && a === p.addrs.memSave) {
      this.log('info', `デモ：メモリー ${String((bytes[0] ?? 0) + 1).padStart(2, '0')} を保存`);
      return;
    }
    if (p.addrs.memInitialize != null && a === p.addrs.memInitialize) {
      this.log('info', `デモ：メモリー ${String((bytes[0] ?? 0) + 1).padStart(2, '0')} を初期化`);
      return;
    }
    this.setBytes(a, bytes);
    if (a === p.addrs.pgm || a === p.addrs.pst) this.refreshTally();
    // Fader Base を持つ機種（V-80HD / VR-120HD）：Level が最大に達したら遷移完了（PGM/PST 入替、Level 0、Base 反転。実機観測）
    if (a === p.addrs.fader && p.addrs.faderBase != null && decodeU14([bytes[0] ?? 0, bytes[1] ?? 0]) >= p.faderMax) {
      this.swapPgmPst();
      this.setBytes(p.addrs.fader, encodeU14(0));
      this.setBytes(p.addrs.faderBase, [(this.mem.get(p.addrs.faderBase) ?? 0) === 1 ? 0 : 1]);
    }
  }

  private swapPgmPst(): void {
    const p = this.profile;
    if (p.addrs.pst == null) return; // PST バスが無い機種（VR-4HD / V-02HD MK II）は入替無し
    const pgm = this.mem.get(p.addrs.pgm) ?? 0;
    const pst = this.mem.get(p.addrs.pst) ?? 0;
    this.setBytes(p.addrs.pgm, [pst]);
    this.setBytes(p.addrs.pst, [pgm]);
    this.refreshTally();
  }

  private refreshTally(): void {
    const p = this.profile;
    if (p.addrs.tallyBlock == null) return;
    writeTally(this.mem, p);
    this.emitParam(p.addrs.tallyBlock, this.readBytes(p.addrs.tallyBlock, p.addrs.tallyBlockSize));
  }

  private setBytes(a: Addr, bytes: number[]): void {
    bytes.forEach((b, i) => this.mem.set(addrOffset(a, i), b));
    this.emitParam(a, bytes);
  }

  private readBytes(a: Addr, size: number): number[] {
    return Array.from({ length: size }, (_, i) => this.mem.get(addrOffset(a, i)) ?? 0);
  }

  private emitParam(a: Addr, bytes: number[]): void {
    const hex = bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    this.log('rx', `DTH:${addrToHex(a)},${hex}`);
    for (const cb of this.paramCbs) cb(a, bytes);
  }

  private emitState(s: LinkState, err?: LinkError): void {
    for (const cb of this.stateCbs) cb(s, err);
  }

  private log(dir: LogEntry['dir'], text: string): void {
    const e: LogEntry = { ts: Date.now(), dir, text };
    for (const cb of this.logCbs) cb(e);
  }

  private later(fn: () => void, ms = LATENCY_MS): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (this.connected) fn();
    }, ms);
    this.timers.add(t);
  }
}
