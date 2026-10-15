import { addr, addrOffset, decodeAscii8, decodeLevel, encodeLevel, type Addr } from '../codec/value';
import type { ModelId } from '../profiles/types';
import v160hdJson from './v160hd.params.json';
import v80hdJson from './v80hd.params.json';
import vr120hdJson from './vr120hd.params.json';
import type { EnumParam, IntParam, ParamCatalog, ParamDef, ParamGroup, ParamInstance } from './types';

export * from './types';

const CATALOGS: Record<ModelId, ParamCatalog> = {
  'V-160HD': v160hdJson as unknown as ParamCatalog,
  'V-80HD': v80hdJson as unknown as ParamCatalog,
  'VR-120HD': vr120hdJson as unknown as ParamCatalog,
};

export function getCatalog(model: ModelId): ParamCatalog {
  return CATALOGS[model];
}

export function findGroup(model: ModelId, groupId: string): ParamGroup | undefined {
  return getCatalog(model).groups.find((g) => g.id === groupId);
}

/** パラメータの実アドレス（xx はインスタンスで決まる） */
export function paramAddr(p: ParamDef, instance: ParamInstance | null): Addr {
  const a2 = p.a2 === 'xx' ? (instance?.xx ?? 0) : parseInt(p.a2, 16);
  return addr(parseInt(p.a1, 16), a2, parseInt(p.a3, 16));
}

/** グループ（1 インスタンス分）の読出し範囲 */
export function groupRanges(g: ParamGroup, instance: ParamInstance | null): { addr: Addr; size: number }[] {
  return g.params.filter((p) => !p.writeOnly && !p.exec).map((p) => ({ addr: paramAddr(p, instance), size: p.size }));
}

// ---- raw ⇄ 表示値 ----------------------------------------------------------

/** 7bit × size の連結値（符号なし） */
export function bytesToRaw(bytes: readonly number[]): number {
  return bytes.reduce((acc, b) => acc * 128 + (b & 0x7f), 0);
}

export function rawToBytes(raw: number, size: number): number[] {
  const out: number[] = [];
  let v = raw;
  for (let i = 0; i < size; i += 1) {
    out.unshift(v & 0x7f);
    v = Math.floor(v / 128);
  }
  return out;
}

/** 符号付き（7bit × size の 2 の補数） */
export function bytesToSigned(bytes: readonly number[]): number {
  const bits = 7 * bytes.length;
  const u = bytesToRaw(bytes);
  return u >= 1 << (bits - 1) ? u - (1 << bits) : u;
}

export function signedToBytes(v: number, size: number): number[] {
  const bits = 7 * size;
  const u = v < 0 ? v + (1 << bits) : v;
  return rawToBytes(u, size);
}

export type ParamValue =
  | { kind: 'bool'; on: boolean }
  | { kind: 'enum'; index: number; label: string }
  | { kind: 'int'; value: number; text: string; isZeroLabel: boolean }
  | { kind: 'level'; db: number | null; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'unknown'; hex: string };

export function decodeParam(p: ParamDef, bytes: readonly number[]): ParamValue {
  switch (p.kind) {
    case 'bool':
      return { kind: 'bool', on: (bytes[0] ?? 0) !== 0 };
    case 'enum': {
      const raw = p.values.some((v) => v < 0) ? bytesToSigned(bytes) : bytesToRaw(bytes);
      const index = p.values.indexOf(raw);
      return { kind: 'enum', index, label: index >= 0 ? (p.labels[index] ?? String(raw)) : `? (${raw})` };
    }
    case 'int': {
      const raw = p.signed ? bytesToSigned(bytes) : bytesToRaw(bytes);
      if (p.zeroLabel != null && raw === (p.zeroRaw ?? 0)) return { kind: 'int', value: raw, text: p.zeroLabel, isZeroLabel: true };
      const value = raw * p.scale;
      return { kind: 'int', value, text: formatInt(p, value), isZeroLabel: false };
    }
    case 'level': {
      const db = decodeLevel(bytes);
      return { kind: 'level', db, text: db === null ? '−INF' : `${db.toFixed(1)} dB` };
    }
    case 'text':
      return { kind: 'text', text: decodeAscii8(bytes.length > 8 ? bytes.slice(0, 8) : bytes) + (bytes.length > 8 ? decodeAscii8(bytes.slice(8)) : '') };
    default:
      return { kind: 'unknown', hex: bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') };
  }
}

export function formatInt(p: IntParam, value: number): string {
  const decimals = p.scale < 1 ? Math.max(0, Math.ceil(-Math.log10(p.scale))) : 0;
  const s = value.toFixed(decimals);
  return p.unit ? `${s}${p.unit === '%' || p.unit === '°' ? '' : ' '}${p.unit}` : s;
}

/** 表示値 → 送信バイト列 */
export function encodeInt(p: IntParam, value: number): number[] {
  const clamped = Math.min(p.max, Math.max(p.min, value));
  const raw = Math.round(clamped / p.scale);
  return p.signed ? signedToBytes(raw, p.size) : rawToBytes(raw, p.size);
}

export function encodeIntZero(p: IntParam): number[] {
  return rawToBytes(p.zeroRaw ?? 0, p.size);
}

export function encodeEnum(p: EnumParam, index: number): number[] {
  const raw = p.values[index] ?? 0;
  return raw < 0 ? signedToBytes(raw, p.size) : rawToBytes(raw, p.size);
}

export function encodeLevelDb(db: number | null): number[] {
  return encodeLevel(db);
}

/** テキスト（size 文字、ASCII、末尾スペース埋め） */
export function encodeText(text: string, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i += 1) {
    const code = i < text.length ? text.charCodeAt(i) : 0x20;
    out.push(code >= 0x20 && code <= 0x7e ? code : 0x20);
  }
  return out;
}

/** 連続する int の刻み（スライダー・ステッパー用） */
export function intStep(p: IntParam): number {
  return p.scale;
}

export function addrRange(a: Addr, size: number): Addr[] {
  return Array.from({ length: size }, (_, i) => addrOffset(a, i));
}
