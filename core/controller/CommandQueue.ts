import type { Addr } from '../codec/value';

/**
 * 送信キュー（SPEC §3-6）。transport 非依存：中身は「書込み」「読出し」の意図だけで、エンコードは送信側が行う。
 * - 2 優先度：HIGH（書込み）／LOW（読出し）。HIGH が常に先
 * - HIGH 同士は最小 highGapMs（既定 20ms）間隔（壁時計で管理）
 * - LOW は lowBatch（既定 4）件ずつ、バッチ間 lowBatchGapMs（既定 5ms）
 * - clear() で世代番号を進め、古いタイマー・コールバックの送信を破棄
 * - 連続値（T バー・フェーダー）は同アドレスの未送信分を最新値で上書き（coalesce）
 */

export type QueuedCommand =
  | { kind: 'write'; addr: Addr; bytes: number[] }
  | { kind: 'read'; addr: Addr; size: number };

export interface CommandQueueOptions {
  highGapMs?: number;
  lowBatch?: number;
  lowBatchGapMs?: number;
  now?: () => number;
}

export class CommandQueue {
  private high: { addr: Addr; bytes: number[]; coalesce: boolean }[] = [];
  private low: { addr: Addr; size: number }[] = [];
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastHighAt = -Infinity;
  private readonly highGapMs: number;
  private readonly lowBatch: number;
  private readonly lowBatchGapMs: number;
  private readonly now: () => number;

  constructor(
    private readonly send: (cmd: QueuedCommand) => void,
    opts: CommandQueueOptions = {},
  ) {
    this.highGapMs = opts.highGapMs ?? 20;
    this.lowBatch = opts.lowBatch ?? 4;
    this.lowBatchGapMs = opts.lowBatchGapMs ?? 5;
    this.now = opts.now ?? (() => Date.now());
  }

  get length(): number {
    return this.high.length + this.low.length;
  }

  /** HIGH：書込み。coalesce=true なら同アドレスの未送信分を最新値で置き換える */
  write(addr: Addr, bytes: readonly number[], coalesce = false): void {
    if (coalesce) {
      const i = this.high.findIndex((h) => h.coalesce && h.addr === addr);
      if (i >= 0) {
        this.high[i] = { addr, bytes: [...bytes], coalesce: true };
        this.pump();
        return;
      }
    }
    this.high.push({ addr, bytes: [...bytes], coalesce });
    this.pump();
  }

  /** LOW：読出し。同一（addr,size）が未送信なら重複させない。同一ティック内の連続呼出しは 1 バッチにまとめるため送信は常に遅延する */
  read(addr: Addr, size: number): void {
    if (this.low.some((l) => l.addr === addr && l.size === size)) return;
    this.low.push({ addr, size });
    if (!this.timer) this.schedule(0, this.generation);
  }

  /** 接続切替時：全破棄＋世代更新 */
  clear(): void {
    this.generation += 1;
    this.high = [];
    this.low = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.clear();
  }

  private pump(): void {
    if (this.timer) return;
    const gen = this.generation;
    const t = this.now();

    if (this.high.length > 0) {
      const wait = this.lastHighAt + this.highGapMs - t;
      if (wait > 0) {
        this.schedule(wait, gen);
        return;
      }
      const h = this.high.shift()!;
      this.lastHighAt = t;
      this.send({ kind: 'write', addr: h.addr, bytes: h.bytes });
      if (this.length > 0) this.schedule(this.highGapMs, gen);
      return;
    }

    if (this.low.length > 0) {
      const batch = this.low.splice(0, this.lowBatch);
      for (const l of batch) this.send({ kind: 'read', addr: l.addr, size: l.size });
      if (this.length > 0) this.schedule(this.lowBatchGapMs, gen);
    }
  }

  private schedule(ms: number, gen: number): void {
    this.timer = setTimeout(() => {
      this.timer = null;
      if (gen !== this.generation) return;
      this.pump();
    }, Math.max(0, ms));
  }
}
