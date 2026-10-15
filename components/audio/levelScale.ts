import { LEVEL_MAX_DB, LEVEL_MIN_DB } from '@/core/codec/value';

/**
 * フェーダー位置 p（0=上端 +10dB … 1=下端 −INF）と dB の対応。
 * ボード S3 の目盛り（0dB を上から 22%）に合わせた区分曲線。
 */
export const ZERO_DB_POS = 0.22;
const CURVE = 0.75;
/** −80.0dB の位置 */
export const MIN_DB_POS = 0.975;
/** これより下は −INF */
export const NEG_INF_POS = 0.995;

export function dbToPos(db: number | null): number {
  'worklet';
  if (db === null) return 1;
  if (db >= 0) return ZERO_DB_POS * ((LEVEL_MAX_DB - Math.min(db, LEVEL_MAX_DB)) / LEVEL_MAX_DB);
  const g = Math.pow(Math.min(-db, -LEVEL_MIN_DB) / -LEVEL_MIN_DB, CURVE);
  return ZERO_DB_POS + (MIN_DB_POS - ZERO_DB_POS) * g;
}

export function posToDb(p: number): number | null {
  'worklet';
  if (p >= NEG_INF_POS) return null;
  if (p <= ZERO_DB_POS) {
    const db = LEVEL_MAX_DB * (1 - Math.max(p, 0) / ZERO_DB_POS);
    return Math.round(db * 10) / 10;
  }
  const g = Math.min(1, (p - ZERO_DB_POS) / (MIN_DB_POS - ZERO_DB_POS));
  const db = -Math.pow(g, 1 / CURVE) * -LEVEL_MIN_DB;
  return Math.round(db * 10) / 10;
}
