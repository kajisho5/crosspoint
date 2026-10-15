import { addr, addrOffset, type Addr } from '../codec/value';
import type { DeviceProfile } from '../profiles/types';
import type { Transport } from '../transport/Transport';

/**
 * 同期エンジン（SPEC §10）。
 * - initialSync()：接続直後に §10-1 の順で読出し、全アドレスが揃う（またはタイムアウト）まで待つ
 * - start()：表示中タブの必要アドレスをポーリング（取りこぼし対策）。重いもの（ラベル・メモリー名）は 10 周期に 1 回
 * - 楽観更新のロールバック：pending が 1.5s 以内に確定しなければ confirmed へ戻し通知
 * - ERR:4/5 受信時は最も古い pending をロールバック
 * transport 非依存（読出しは transport.readParam、状態は ParamStoreLike 経由）。
 */

export type VisibleTab = 'switcher' | 'keys' | 'audio' | 'memory' | 'more';

export interface ParamStoreLike {
  getValue(a: Addr): number | undefined;
  pendingEntries(): { addr: Addr; ts: number }[];
  rollback(a: Addr): void;
}

export interface SyncEngineOptions {
  /** 'lan' | 'midi'：版読出しの要否とポーリング周期の下限に使う */
  link: 'lan' | 'midi';
  pollMs: () => number;
  /** ロールバック・同期タイムアウトなどの利用者向け通知 */
  onNotice?: (message: string) => void;
  log?: (text: string) => void;
  now?: () => number;
}

export const ROLLBACK_AFTER_MS = 1500;
export const ROLLBACK_CHECK_MS = 250;
export const HEAVY_EVERY_N_CYCLES = 10;
export const INITIAL_SYNC_TIMEOUT_MS = 4000;
export const MIDI_MIN_POLL_MS = 1000;

/** SPEC §9-1：TALLY SEND ACTIVE（V-160HD。capabilities.tallySubscribe が真のときだけ送る） */
export const TALLY_SUBSCRIBE_ADDR: Addr = addr(0x0c, 0x01, 0x00);
export const VERSION_ADDR: Addr = addr(0x02, 0x00, 0x00);
export const VERSION_SIZE = 6;

export interface ReadRange {
  addr: Addr;
  size: number;
}

/** 重なり・隣接する読出し範囲をまとめる（RQH/RQ1 の件数を減らす） */
export function mergeRanges(ranges: readonly ReadRange[]): ReadRange[] {
  const sorted = [...ranges].filter((r) => r.size > 0).sort((x, y) => x.addr - y.addr);
  const out: ReadRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.addr <= last.addr + last.size) {
      const end = Math.max(last.addr + last.size, r.addr + r.size);
      last.size = end - last.addr;
    } else {
      out.push({ addr: r.addr, size: r.size });
    }
  }
  return out;
}

export function initialSyncRanges(p: DeviceProfile, link: 'lan' | 'midi', visible: VisibleTab): ReadRange[] {
  const r: ReadRange[] = [];
  if (link === 'midi') r.push({ addr: VERSION_ADDR, size: VERSION_SIZE });
  for (let n = 1; n <= p.inputCount; n += 1) r.push({ addr: p.addrs.inputAssign(n), size: 1 });
  for (const s of p.sources) if (s.labelAddr != null) r.push({ addr: s.labelAddr, size: 8 });
  r.push({ addr: p.addrs.pgm, size: 2 }, { addr: p.addrs.fader, size: 2 });
  r.push({ addr: p.addrs.transType, size: 1 }, { addr: p.addrs.transTime, size: 1 });
  r.push(...keyRanges(p));
  r.push({ addr: p.addrs.memCurrent, size: 1 });
  for (let n = 1; n <= p.memoryCount; n += 1) r.push({ addr: p.addrs.memName(n), size: 8 });
  r.push({ addr: p.addrs.tallyBlock, size: p.addrs.tallyBlockSize });
  if (visible === 'audio') r.push(...audioRanges(p));
  return mergeRanges(r);
}

function keyRanges(p: DeviceProfile): ReadRange[] {
  const r: ReadRange[] = [];
  for (let n = 1; n <= p.pinpCount; n += 1) {
    const k = p.addrs.pinp(n);
    r.push({ addr: k.pgm, size: 1 }, { addr: k.pvw, size: 1 }, { addr: k.source, size: 1 }, { addr: k.time, size: 1 });
  }
  for (let n = 1; n <= p.dskCount; n += 1) {
    const k = p.addrs.dsk(n);
    r.push({ addr: k.pgm, size: 1 }, { addr: k.pvw, size: 1 }, { addr: k.source, size: 1 }, { addr: k.time, size: 1 });
    if (k.type != null) r.push({ addr: k.type, size: 1 });
  }
  if (p.capabilities.split) for (let n = 1; n <= p.splitCount; n += 1) r.push({ addr: p.addrs.split(n), size: 1 });
  return r;
}

function audioRanges(p: DeviceProfile): ReadRange[] {
  const r: ReadRange[] = [];
  for (const ch of p.audioInputs) {
    // level(3byte) と mute(1byte) は 01 xx 03–06 で連続
    r.push({ addr: p.addrs.audioLevel(ch.x), size: 3 }, { addr: p.addrs.audioMute(ch.x), size: 1 });
  }
  r.push({ addr: p.addrs.masterLevel, size: 3 }, { addr: p.addrs.masterMute, size: 1 });
  return r;
}

/** 表示中タブのポーリング対象（light = 毎周期、heavy = 10 周期に 1 回） */
export function pollRanges(p: DeviceProfile, visible: VisibleTab): { light: ReadRange[]; heavy: ReadRange[] } {
  const light: ReadRange[] = [];
  const heavy: ReadRange[] = [];
  switch (visible) {
    case 'switcher':
      light.push({ addr: p.addrs.pgm, size: 2 }, { addr: p.addrs.fader, size: 2 });
      light.push({ addr: p.addrs.transType, size: 1 }, { addr: p.addrs.transTime, size: 1 });
      light.push({ addr: p.addrs.tallyBlock, size: p.addrs.tallyBlockSize });
      for (let n = 1; n <= p.inputCount; n += 1) heavy.push({ addr: p.addrs.inputAssign(n), size: 1 });
      for (const s of p.sources) if (s.labelAddr != null) heavy.push({ addr: s.labelAddr, size: 8 });
      break;
    case 'keys':
      light.push(...keyRanges(p));
      break;
    case 'audio':
      light.push(...audioRanges(p));
      break;
    case 'memory':
      light.push({ addr: p.addrs.memCurrent, size: 1 });
      for (let n = 1; n <= p.memoryCount; n += 1) heavy.push({ addr: p.addrs.memName(n), size: 8 });
      break;
    default:
      break;
  }
  return { light: mergeRanges(light), heavy: mergeRanges(heavy) };
}

export class SyncEngine {
  private visible: VisibleTab = 'switcher';
  /** 画面が追加で監視したい範囲（設定メニューの表示中グループなど）。毎周期読む */
  private extra: ReadRange[] = [];
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private rollbackTimer: ReturnType<typeof setInterval> | null = null;
  private cycle = 0;
  private running = false;
  private readonly now: () => number;

  constructor(
    private readonly transport: Pick<Transport, 'readParam' | 'writeParam'>,
    private readonly profile: DeviceProfile,
    private readonly store: ParamStoreLike,
    private readonly opts: SyncEngineOptions,
  ) {
    this.now = opts.now ?? (() => Date.now());
  }

  setVisibleTab(tab: VisibleTab): void {
    this.visible = tab;
  }

  setExtraPoll(ranges: ReadRange[] | null): void {
    this.extra = ranges ? mergeRanges(ranges) : [];
  }

  /** 任意範囲の即時読出し（画面を開いた直後など） */
  readNow(ranges: ReadRange[]): void {
    for (const r of mergeRanges(ranges)) this.transport.readParam(r.addr, r.size);
  }

  /** §10-1：読出しを発行し、全範囲が揃うかタイムアウトまで待つ。戻り値は未受信の範囲 */
  async initialSync(timeoutMs = INITIAL_SYNC_TIMEOUT_MS): Promise<{ missing: ReadRange[] }> {
    const ranges = initialSyncRanges(this.profile, this.opts.link, this.visible);
    for (const r of ranges) this.transport.readParam(r.addr, r.size);
    if (this.profile.capabilities.tallySubscribe) this.transport.writeParam(TALLY_SUBSCRIBE_ADDR, [0x01]);

    const deadline = this.now() + timeoutMs;
    let missing = this.missingOf(ranges);
    while (missing.length > 0 && this.now() < deadline) {
      await sleep(50);
      missing = this.missingOf(ranges);
    }
    if (missing.length > 0) {
      this.opts.log?.(`初期同期：${missing.length} 範囲が未受信（タイムアウト ${timeoutMs}ms）`);
    }
    return { missing };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.cycle = 0;
    this.schedulePoll();
    this.rollbackTimer = setInterval(() => this.checkPending(), ROLLBACK_CHECK_MS);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    if (this.rollbackTimer) clearInterval(this.rollbackTimer);
    this.rollbackTimer = null;
  }

  /** ERR:4/5 受信：最も古い pending を戻す */
  onDeviceError(code: number): void {
    if (code !== 4 && code !== 5) return;
    const oldest = [...this.store.pendingEntries()].sort((x, y) => x.ts - y.ts)[0];
    if (!oldest) return;
    this.store.rollback(oldest.addr);
    this.opts.onNotice?.(code === 5 ? '値が範囲外のため本体に反映されませんでした' : '他の設定で無効化されているため反映されませんでした');
  }

  /** 1 周期分のポーリング（テスト用に公開） */
  pollOnce(): void {
    const { light, heavy } = pollRanges(this.profile, this.visible);
    for (const r of light) this.transport.readParam(r.addr, r.size);
    for (const r of this.extra) this.transport.readParam(r.addr, r.size);
    if (this.cycle % HEAVY_EVERY_N_CYCLES === 0) for (const r of heavy) this.transport.readParam(r.addr, r.size);
    this.cycle += 1;
  }

  /** 楽観更新の期限切れを戻す（テスト用に公開） */
  checkPending(): void {
    const t = this.now();
    for (const p of this.store.pendingEntries()) {
      if (t - p.ts >= ROLLBACK_AFTER_MS) {
        this.store.rollback(p.addr);
        this.opts.onNotice?.('本体に反映されませんでした');
      }
    }
  }

  private schedulePoll(): void {
    if (!this.running) return;
    const base = this.opts.pollMs();
    const ms = this.opts.link === 'midi' ? Math.max(MIDI_MIN_POLL_MS, base) : base;
    this.pollTimer = setTimeout(() => {
      if (!this.running) return;
      this.pollOnce();
      this.schedulePoll();
    }, ms);
  }

  private missingOf(ranges: readonly ReadRange[]): ReadRange[] {
    return ranges.filter((r) => {
      for (let i = 0; i < r.size; i += 1) if (this.store.getValue(addrOffset(r.addr, i)) === undefined) return true;
      return false;
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
