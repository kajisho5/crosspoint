import { dbToPos, NEG_INF_POS, posToDb, ZERO_DB_POS } from '@/components/audio/levelScale';
import { parseHexBytes } from '@/lib/format';
import { LOG_CAPACITY, useLogStore } from '@/stores/log';

describe('フェーダー目盛り', () => {
  test('端点と 0dB', () => {
    expect(dbToPos(10)).toBe(0);
    expect(dbToPos(0)).toBeCloseTo(ZERO_DB_POS);
    expect(dbToPos(null)).toBe(1);
    expect(posToDb(1)).toBeNull();
    expect(posToDb(NEG_INF_POS)).toBeNull();
    expect(posToDb(0)).toBe(10);
  });

  test('往復（0.1dB 丸め）', () => {
    for (const db of [-80, -40, -12.5, -6, -0.1, 0, 3.5, 10]) {
      expect(posToDb(dbToPos(db))).toBeCloseTo(db, 1);
    }
  });

  test('単調減少', () => {
    let prev = Infinity;
    for (let p = 0; p < NEG_INF_POS; p += 0.01) {
      const db = posToDb(p);
      expect(db).not.toBeNull();
      expect(db!).toBeLessThanOrEqual(prev);
      prev = db!;
    }
  });
});

describe('16 進入力', () => {
  test('正常', () => {
    expect(parseHexBytes('20')).toEqual([0x20]);
    expect(parseHexBytes('7f 00, 1e')).toEqual([0x7f, 0x00, 0x1e]);
  });
  test('不正', () => {
    expect(parseHexBytes('')).toBeNull();
    expect(parseHexBytes('2')).toBeNull();
    expect(parseHexBytes('zz')).toBeNull();
    expect(parseHexBytes('80')).toBeNull();
  });
});

test('ログはリングバッファ 500 件', () => {
  const push = useLogStore.getState().push;
  for (let i = 0; i < LOG_CAPACITY + 20; i += 1) push({ ts: i, dir: 'tx', text: `L${i}` });
  const lines = useLogStore.getState().lines;
  expect(lines).toHaveLength(LOG_CAPACITY);
  expect(lines[0]?.text).toBe('L20');
  expect(lines[lines.length - 1]?.text).toBe(`L${LOG_CAPACITY + 19}`);
});

describe('オーディオフェーダーの 0dB 吸い付き', () => {
  const { snapZero, ZERO_DB_POS, posToDb } = require('@/components/audio/levelScale') as typeof import('@/components/audio/levelScale');
  test('0dB の位置 ± zone は 0.0dB、外は素通し', () => {
    const z = 9 / 340;
    expect(posToDb(snapZero(ZERO_DB_POS + z * 0.9, z))).toBe(0);
    expect(posToDb(snapZero(ZERO_DB_POS - z * 0.9, z))).toBe(0);
    expect(snapZero(ZERO_DB_POS + z * 1.5, z)).toBeCloseTo(ZERO_DB_POS + z * 1.5);
  });
});
