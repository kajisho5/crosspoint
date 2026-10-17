/**
 * Roland パラメーターの値エンコード（SPEC §2-1）。
 * 全 transport 共通。1 バイトは 7bit（00–7F）。
 */

/** 3 バイトアドレス（各 00–7F）を 21bit の整数に詰めたもの。+1 で 7bit 桁上がりも正しく進む。 */
export type Addr = number;

export function addr(a1: number, a2: number, a3: number): Addr {
  assert7(a1);
  assert7(a2);
  assert7(a3);
  return (a1 << 14) | (a2 << 7) | a3;
}

export function addrBytes(a: Addr): [number, number, number] {
  return [(a >> 14) & 0x7f, (a >> 7) & 0x7f, a & 0x7f];
}

/** "002100" 形式 */
export function addrToHex(a: Addr): string {
  return addrBytes(a)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}

export function hexToAddr(hex: string): Addr {
  if (!/^[0-7][0-9A-Fa-f][0-7][0-9A-Fa-f][0-7][0-9A-Fa-f]$/.test(hex)) {
    throw new RangeError(`不正なアドレス: ${hex}`);
  }
  return addr(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
}

/** アドレスに i を足す（7bit 桁上がりあり） */
export function addrOffset(a: Addr, i: number): Addr {
  return a + i;
}

function assert7(v: number): void {
  if (!Number.isInteger(v) || v < 0 || v > 0x7f) {
    throw new RangeError(`7bit 範囲外: ${v}`);
  }
}

export function encodeU7(v: number): number[] {
  assert7(v);
  return [v];
}

export function decodeU7(bytes: readonly number[]): number {
  return bytes[0] ?? 0;
}

/** 2byte 符号なし：hi*128 + lo（0–16383） */
export function encodeU14(v: number): number[] {
  if (!Number.isInteger(v) || v < 0 || v > 0x3fff) {
    throw new RangeError(`u14 範囲外: ${v}`);
  }
  return [(v >> 7) & 0x7f, v & 0x7f];
}

export function decodeU14(bytes: readonly number[]): number {
  return ((bytes[0] ?? 0) << 7) | (bytes[1] ?? 0);
}

/** 2byte 符号付き（14bit 2 の補数）。例 −420 → 7C 5C */
export function encodeS14(v: number): number[] {
  if (!Number.isInteger(v) || v < -0x2000 || v > 0x1fff) {
    throw new RangeError(`s14 範囲外: ${v}`);
  }
  return encodeU14(v & 0x3fff);
}

export function decodeS14(bytes: readonly number[]): number {
  const u = decodeU14(bytes);
  return u & 0x2000 ? u - 0x4000 : u;
}

/** 3byte 符号付き（21bit 2 の補数）。例 −800 → 7F 79 60、−60 → 7F 7F 44 */
export function encodeS21(v: number): number[] {
  if (!Number.isInteger(v) || v < -0x100000 || v > 0xfffff) {
    throw new RangeError(`s21 範囲外: ${v}`);
  }
  const u = v & 0x1fffff;
  return [(u >> 14) & 0x7f, (u >> 7) & 0x7f, u & 0x7f];
}

export function decodeS21(bytes: readonly number[]): number {
  const u = ((bytes[0] ?? 0) << 14) | ((bytes[1] ?? 0) << 7) | (bytes[2] ?? 0);
  return u & 0x100000 ? u - 0x200000 : u;
}

/** LEVEL（0.1dB 単位、−80.0〜+10.0dB、−INF = 7E 00 00） */
export const LEVEL_MIN_DB = -80;
export const LEVEL_MAX_DB = 10;
export const LEVEL_NEG_INF: readonly number[] = [0x7e, 0x00, 0x00];

export function encodeLevel(db: number | null): number[] {
  if (db === null) return [...LEVEL_NEG_INF];
  const clamped = Math.min(LEVEL_MAX_DB, Math.max(LEVEL_MIN_DB, db));
  return encodeS21(Math.round(clamped * 10));
}

export function decodeLevel(bytes: readonly number[]): number | null {
  if (bytes[0] === 0x7e && bytes[1] === 0x00 && bytes[2] === 0x00) return null;
  return decodeS21(bytes) / 10;
}

export function formatDb(db: number | null): string {
  if (db === null) return '−INF';
  const s = db.toFixed(1);
  return db < 0 ? `−${s.slice(1)}` : s;
}

/** テキスト：1byte×8、ASCII として扱う【推測】、末尾スペース除去 */
/**
 * 8 文字の ASCII。文字の後ろは pad で埋める。
 * ラベル（Preview Label）は 00H で埋める：ガイドの値域は 00H–7FH。20H（スペース）で埋めると本体のマルチビューで
 * ラベル背景が 8 文字分の幅になり、右に空白が付いて見えた（V-80HD 実機、2026-10-17）
 */
export function encodeAscii8(text: string, pad: 0x00 | 0x20 = 0x20): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    if (i >= text.length) {
      out.push(pad);
      continue;
    }
    const code = text.charCodeAt(i);
    out.push(code >= 0x20 && code <= 0x7e ? code : 0x20);
  }
  return out;
}

export function decodeAscii8(bytes: readonly number[]): string {
  return bytes
    .slice(0, 8)
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ' '))
    .join('')
    .replace(/\s+$/, '');
}

/** トランジション時間：00–28 → 0.0–4.0 秒 */
export function decodeTime(bytes: readonly number[]): number {
  return decodeU7(bytes) / 10;
}

export function encodeTime(seconds: number): number[] {
  const v = Math.round(Math.min(4, Math.max(0, seconds)) * 10);
  return encodeU7(v);
}

/**
 * 1 バイト 0–127 のレベル（V-1HD / V-1SDI）を dB 表示へ。資料は「0–127」としか書かないので
 * 0 = -INF、127 = +10 dB、100 = 0 dB と置く【推測：V-1HD のレベル表記。実機で確認】
 */
export function u7ToDb(v: number): number | null {
  if (v <= 0) return null;
  return Math.round(((v - 100) * (v >= 100 ? 10 / 27 : 80 / 100)) * 10) / 10;
}
export function dbToU7(db: number | null): number {
  if (db == null) return 0;
  const v = db >= 0 ? 100 + (db * 27) / 10 : 100 + (db * 100) / 80;
  return Math.max(0, Math.min(127, Math.round(v)));
}
