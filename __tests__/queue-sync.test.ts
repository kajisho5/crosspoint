import { CommandQueue, type QueuedCommand } from '@/core/controller/CommandQueue';
import {
  HEAVY_EVERY_N_CYCLES,
  initialSyncRanges,
  mergeRanges,
  pollRanges,
  ROLLBACK_AFTER_MS,
  SyncEngine,
  VERIFY_AFTER_MS,
  TALLY_SUBSCRIBE_ADDR,
  type ParamStoreLike,
} from '@/core/controller/SyncEngine';
import { addr, addrOffset, type Addr } from '@/core/codec/value';
import { v160hd } from '@/core/profiles/v160hd';
import { v80hd } from '@/core/profiles/v80hd';
import { useParamStore } from '@/stores/param';

const A = addr(0x00, 0x21, 0x00);
const B = addr(0x00, 0x21, 0x01);
const F = addr(0x00, 0x21, 0x02);

describe('CommandQueue（SPEC §3-6）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup() {
    const sent: QueuedCommand[] = [];
    const times: number[] = [];
    const q = new CommandQueue(
      (c) => {
        sent.push(c);
        times.push(Date.now());
      },
      { now: () => Date.now() },
    );
    return { q, sent, times };
  }

  test('HIGH は 20ms 間隔、LOW は HIGH の後', () => {
    const { q, sent, times } = setup();
    q.write(A, [1]);
    q.write(B, [2]);
    q.read(A, 2);
    expect(sent.map((c) => c.kind)).toEqual(['write']);
    jest.advanceTimersByTime(19);
    expect(sent.length).toBe(1);
    jest.advanceTimersByTime(1);
    expect(sent.map((c) => c.kind)).toEqual(['write', 'write']);
    jest.advanceTimersByTime(20);
    expect(sent.map((c) => c.kind)).toEqual(['write', 'write', 'read']);
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBe(20);
  });

  test('LOW は 4 件ずつ、バッチ間 5ms', () => {
    const { q, sent } = setup();
    for (let i = 0; i < 6; i += 1) q.read(addrOffset(A, i), 1);
    expect(sent.length).toBe(0);
    jest.advanceTimersByTime(0);
    expect(sent.length).toBe(4);
    jest.advanceTimersByTime(4);
    expect(sent.length).toBe(4);
    jest.advanceTimersByTime(1);
    expect(sent.length).toBe(6);
  });

  test('LOW の重複（同 addr/size）は待機中なら捨てる', () => {
    const { q, sent } = setup();
    q.write(A, [1]); // 即送信
    q.write(B, [2]); // 20ms 待ち → 以降は待機列に入る
    q.read(A, 2);
    q.read(A, 2);
    q.read(A, 3);
    expect(q.length).toBe(3);
    jest.advanceTimersByTime(40);
    expect(sent.map((c) => c.kind)).toEqual(['write', 'write', 'read', 'read']);
  });

  test('coalesce：同アドレスの未送信分を最新値で上書き', () => {
    const { q, sent } = setup();
    q.write(F, [0, 0], true); // 即送信
    q.write(F, [1, 0], true); // 待機中
    q.write(F, [2, 0], true); // 上書き
    q.write(F, [3, 0], true); // 上書き
    jest.advanceTimersByTime(20);
    expect(sent).toEqual([
      { kind: 'write', addr: F, bytes: [0, 0] },
      { kind: 'write', addr: F, bytes: [3, 0] },
    ]);
    expect(q.length).toBe(0);
  });

  test('clear() で世代が進み古い送信は破棄', () => {
    const { q, sent } = setup();
    q.write(A, [1]);
    q.write(B, [2]);
    q.clear();
    jest.advanceTimersByTime(100);
    expect(sent.length).toBe(1);
    q.write(A, [3]);
    expect(sent.length).toBe(2);
  });
});

function mem(): ParamStoreLike & { values: Map<Addr, number>; pending: Map<Addr, number>; rolledBack: Addr[] } {
  const values = new Map<Addr, number>();
  const pending = new Map<Addr, number>();
  const rolledBack: Addr[] = [];
  return {
    values,
    pending,
    rolledBack,
    getValue: (a) => values.get(a),
    pendingEntries: () => [...pending].map(([a, ts]) => ({ addr: a, ts })),
    rollback: (a) => {
      pending.delete(a);
      rolledBack.push(a);
    },
  };
}

describe('SyncEngine（SPEC §10）', () => {
  test('mergeRanges：隣接・重複をまとめ、離れたものは分ける', () => {
    expect(mergeRanges([{ addr: A, size: 2 }, { addr: F, size: 2 }])).toEqual([{ addr: A, size: 4 }]);
    expect(mergeRanges([{ addr: addr(0, 0x1f, 0), size: 2 }, { addr: addr(0, 0x1f, 3), size: 1 }])).toEqual([
      { addr: addr(0, 0x1f, 0), size: 2 },
      { addr: addr(0, 0x1f, 3), size: 1 },
    ]);
    // 7bit 桁上がり：00217F の次は 002200
    expect(mergeRanges([{ addr: addr(0, 0x21, 0x7f), size: 1 }, { addr: addr(0, 0x22, 0), size: 1 }])).toEqual([{ addr: addr(0, 0x21, 0x7f), size: 2 }]);
  });

  test('V-160HD の初期同期範囲（§10-1）', () => {
    const r = initialSyncRanges(v160hd, 'lan', 'switcher');
    const has = (a: Addr, size: number) => r.some((x) => x.addr === a && x.size === size);
    expect(has(addr(0, 0, 0), 10)).toBe(true); // INPUT 1–10 割当
    expect(has(addr(0, 0, 0x24), 10)).toBe(true); // INPUT 11–20
    expect(has(addr(0, 0x21, 0), 4)).toBe(true); // PGM/PST/Tバー
    expect(has(addr(0, 0x17, 0), 7)).toBe(true); // MIX/WIPE＋PinP1–4＋DSK1–2 の時間
    expect(has(addr(0, 0x1b, 0), 3)).toBe(true); // PinP1 pgm/pvw/source
    expect(has(addr(0x0c, 0, 0), 42)).toBe(true); // タリー
    expect(has(addr(0x60, 0x1d, 0), 8)).toBe(true); // メモリー 30 の名前
    expect(r.some((x) => x.addr === addr(0x02, 0, 0))).toBe(false); // LAN は版を読まない
    expect(r.some((x) => x.addr === addr(0x01, 0x00, 0x03))).toBe(false); // オーディオは表示中のみ
    expect(initialSyncRanges(v160hd, 'midi', 'audio').some((x) => x.addr === addr(0x02, 0, 0) && x.size === 6)).toBe(true);
    expect(initialSyncRanges(v160hd, 'lan', 'audio').some((x) => x.addr === addr(0x01, 0x00, 0x03) && x.size === 4)).toBe(true);
  });

  test('V-80HD の初期同期範囲は V-80HD のアドレス', () => {
    const r = initialSyncRanges(v80hd, 'lan', 'switcher');
    expect(r.some((x) => x.addr === addr(0, 0x15, 0) && x.size === 4)).toBe(true);
    expect(r.some((x) => x.addr === addr(0x0c, 0, 0) && x.size === 57)).toBe(true);
    expect(r.some((x) => x.addr === addr(0, 0x14, 0) && x.size === 3)).toBe(true); // DSK time/pgm/pvw
  });

  test('initialSync：読出しを発行し、値が揃ったら resolve。V-160HD はタリー購読を書く', async () => {
    const store = mem();
    const reads: { a: Addr; size: number }[] = [];
    const writes: { a: Addr; bytes: number[] }[] = [];
    const transport = {
      readParam: (a: Addr, size: number) => {
        reads.push({ a, size });
        for (let i = 0; i < size; i += 1) store.values.set(addrOffset(a, i), 0);
      },
      writeParam: (a: Addr, bytes: number[]) => writes.push({ a, bytes }),
    };
    const e = new SyncEngine(transport, v160hd, store, { link: 'lan', pollMs: () => 500 });
    const { missing } = await e.initialSync(500);
    expect(missing).toEqual([]);
    expect(reads.length).toBe(initialSyncRanges(v160hd, 'lan', 'switcher').length);
    expect(writes).toEqual([{ a: TALLY_SUBSCRIBE_ADDR, bytes: [1] }]);
  });

  test('initialSync：V-80HD は購読を書かず、未受信はタイムアウトで missing', async () => {
    const store = mem();
    const writes: Addr[] = [];
    const transport = { readParam: () => {}, writeParam: (a: Addr) => writes.push(a) };
    const e = new SyncEngine(transport, v80hd, store, { link: 'lan', pollMs: () => 500 });
    const { missing } = await e.initialSync(120);
    expect(missing.length).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  test('pollRanges：表示中タブのみ、重いものは 10 周期に 1 回', () => {
    jest.useFakeTimers();
    const store = mem();
    const reads: Addr[] = [];
    const transport = { readParam: (a: Addr) => reads.push(a), writeParam: () => {} };
    const e = new SyncEngine(transport, v160hd, store, { link: 'lan', pollMs: () => 100 });
    e.setVisibleTab('memory');
    const { light, heavy } = pollRanges(v160hd, 'memory');
    expect(light).toEqual([{ addr: addr(0x0a, 0, 3), size: 1 }]);
    expect(heavy.length).toBe(30);
    e.start();
    jest.advanceTimersByTime(100);
    expect(reads.length).toBe(1 + 30);
    jest.advanceTimersByTime(100 * (HEAVY_EVERY_N_CYCLES - 1));
    expect(reads.length).toBe(1 + 30 + (HEAVY_EVERY_N_CYCLES - 1));
    jest.advanceTimersByTime(100);
    expect(reads.length).toBe(2 * (1 + 30) + (HEAVY_EVERY_N_CYCLES - 1));
    e.stop();
    jest.advanceTimersByTime(1000);
    expect(reads.length).toBe(2 * (1 + 30) + (HEAVY_EVERY_N_CYCLES - 1));
    jest.useRealTimers();
  });

  test('MIDI はポーリング周期 1000ms 未満にしない', () => {
    jest.useFakeTimers();
    const store = mem();
    const reads: Addr[] = [];
    const e = new SyncEngine({ readParam: (a: Addr) => reads.push(a), writeParam: () => {} }, v160hd, store, { link: 'midi', pollMs: () => 250 });
    e.start();
    jest.advanceTimersByTime(999);
    expect(reads.length).toBe(0);
    jest.advanceTimersByTime(1);
    expect(reads.length).toBeGreaterThan(0);
    e.stop();
    jest.useRealTimers();
  });

  test('楽観更新のロールバック：1.5s 経過で confirmed に戻し通知', () => {
    let now = 10_000;
    const store = mem();
    const notices: string[] = [];
    const e = new SyncEngine({ readParam: () => {}, writeParam: () => {} }, v160hd, store, { link: 'lan', pollMs: () => 500, onNotice: (m) => notices.push(m), now: () => now });
    store.pending.set(A, now);
    now += ROLLBACK_AFTER_MS - 1;
    e.checkPending();
    expect(store.rolledBack).toEqual([]);
    now += 1;
    e.checkPending();
    expect(store.rolledBack).toEqual([A]);
    expect(notices.length).toBe(1);
  });

  test('ポーリング対象外の書込み：400ms で読み直し、応答で確定すればロールバックしない（クイック操作の誤通知対策）', () => {
    let now = 10_000;
    const store = mem();
    const notices: string[] = [];
    const reads: { a: Addr; size: number }[] = [];
    const st = { ...store, pendingEntries: () => [...store.pending].map(([a, ts]) => ({ addr: a, ts, size: 2 })) };
    const e = new SyncEngine({ readParam: (a, size) => reads.push({ a, size }), writeParam: () => {} }, v160hd, st, { link: 'midi', pollMs: () => 1000, onNotice: (m) => notices.push(m), now: () => now });
    store.pending.set(A, now);
    now += VERIFY_AFTER_MS;
    e.checkPending();
    expect(reads).toEqual([{ a: A, size: 2 }]);
    e.checkPending();
    expect(reads).toHaveLength(1); // 同じ書込みには 1 回だけ
    store.pending.delete(A); // 読出し応答で確定
    now += ROLLBACK_AFTER_MS;
    e.checkPending();
    expect(notices).toEqual([]);
  });

  test('ERR:4/5 で最も古い pending をロールバック。他のコードは無視', () => {
    const store = mem();
    const e = new SyncEngine({ readParam: () => {}, writeParam: () => {} }, v160hd, store, { link: 'lan', pollMs: () => 500 });
    store.pending.set(B, 200);
    store.pending.set(A, 100);
    e.onDeviceError(0);
    expect(store.rolledBack).toEqual([]);
    e.onDeviceError(5);
    expect(store.rolledBack).toEqual([A]);
    e.onDeviceError(4);
    expect(store.rolledBack).toEqual([A, B]);
  });
});

describe('paramStore の楽観更新と rollback', () => {
  beforeEach(() => useParamStore.getState().clear());

  test('受信値は confirmed、楽観値は values のみ。rollback で戻る', () => {
    const s = useParamStore.getState();
    s.apply(F, [0x08, 0x00]);
    s.optimistic(F, [0x0f, 0x7f]);
    expect(useParamStore.getState().values[F]).toBe(0x0f);
    expect(useParamStore.getState().confirmed[F]).toBe(0x08);
    expect(useParamStore.getState().pending[F]?.bytes).toEqual([0x0f, 0x7f]);
    useParamStore.getState().rollback(F);
    expect(useParamStore.getState().values[F]).toBe(0x08);
    expect(useParamStore.getState().values[addrOffset(F, 1)]).toBe(0x00);
    expect(useParamStore.getState().pending[F]).toBeUndefined();
  });

  test('受信範囲に先頭が含まれる pending は確定扱い', () => {
    const s = useParamStore.getState();
    s.optimistic(B, [0x22]);
    s.apply(A, [0x20, 0x22]);
    expect(useParamStore.getState().pending[B]).toBeUndefined();
    expect(useParamStore.getState().confirmed[B]).toBe(0x22);
  });

  test('confirmed が無い楽観値の rollback は値を消す', () => {
    const s = useParamStore.getState();
    s.optimistic(A, [1]);
    useParamStore.getState().rollback(A);
    expect(useParamStore.getState().values[A]).toBeUndefined();
  });
});
