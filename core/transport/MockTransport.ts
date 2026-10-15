import { addrOffset, addrToHex, decodeTime, type Addr } from '../codec/value';
import { getProfile } from '../profiles';
import type { DeviceProfile, ModelId } from '../profiles/types';
import { buildDemoState, writeTally, type ByteMap } from './demoState';
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

const DEMO_VERSIONS: Record<ModelId, string> = { 'V-160HD': '3.60', 'V-80HD': '1.30' };
const LATENCY_MS = 12;

export class MockTransport implements Transport {
  readonly kind: TransportKind = 'mock';

  private profile: DeviceProfile;
  private mem: ByteMap = new Map();
  private paramCbs = new Set<ParamCb>();
  private stateCbs = new Set<StateCb>();
  private logCbs = new Set<LogCb>();
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
  on(ev: 'param' | 'state' | 'log', cb: ParamCb | StateCb | LogCb): Unsub {
    const set = (ev === 'param' ? this.paramCbs : ev === 'state' ? this.stateCbs : this.logCbs) as Set<typeof cb>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
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
      this.setBytes(p.addrs.memCurrent, [bytes[0] ?? 0]);
      return;
    }
    this.setBytes(a, bytes);
    if (a === p.addrs.pgm || a === p.addrs.pst) this.refreshTally();
  }

  private swapPgmPst(): void {
    const p = this.profile;
    const pgm = this.mem.get(p.addrs.pgm) ?? 0;
    const pst = this.mem.get(p.addrs.pst) ?? 0;
    this.setBytes(p.addrs.pgm, [pst]);
    this.setBytes(p.addrs.pst, [pgm]);
    this.refreshTally();
  }

  private refreshTally(): void {
    const p = this.profile;
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
