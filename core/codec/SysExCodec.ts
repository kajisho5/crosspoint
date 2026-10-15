import { addr as makeAddr, addrBytes, type Addr } from './value';

/**
 * Roland SysEx（DT1 / RQ1）の組立てと解釈（SPEC §4-1・§4-2）。
 *   DT1: F0 41 10 {modelId…} 12 a1 a2 a3 d1…dn sum F7
 *   RQ1: F0 41 10 {modelId…} 11 a1 a2 a3 s1 s2 s3 sum F7
 *   sum = (128 − (Σ(addr + data|size) mod 128)) mod 128
 * modelId の長さは機種で異なる（V-160HD 5byte / V-80HD 3byte）。固定長を仮定しない。
 */

export const SYSEX_START = 0xf0;
export const SYSEX_END = 0xf7;
export const ROLAND_ID = 0x41;
export const DEVICE_ID = 0x10;
export const CMD_RQ1 = 0x11;
export const CMD_DT1 = 0x12;

/** SPEC §4-1：パケット間隔の下限 */
export const SYSEX_MIN_INTERVAL_MS = 20;
/** SPEC §4-1：1 パケットの上限（超えたら分割。v1 では発生しない） */
export const SYSEX_MAX_PACKET = 256;

export function rolandChecksum(payload: readonly number[]): number {
  const sum = payload.reduce((acc, b) => acc + b, 0);
  return (128 - (sum % 128)) % 128;
}

function assert7(bytes: readonly number[], what: string): void {
  for (const b of bytes) {
    if (!Number.isInteger(b) || b < 0 || b > 0x7f) throw new RangeError(`${what} が 7bit 範囲外: ${b}`);
  }
}

export function buildDt1(modelId: readonly number[], a: Addr, data: readonly number[]): number[] {
  if (data.length === 0) throw new RangeError('DT1 のデータが空');
  assert7(data, 'DT1 データ');
  const body = [...addrBytes(a), ...data];
  const out = [SYSEX_START, ROLAND_ID, DEVICE_ID, ...modelId, CMD_DT1, ...body, rolandChecksum(body), SYSEX_END];
  if (out.length > SYSEX_MAX_PACKET) throw new RangeError(`SysEx が ${SYSEX_MAX_PACKET} byte を超過: ${out.length}`);
  return out;
}

export function buildRq1(modelId: readonly number[], a: Addr, size: number): number[] {
  if (!Number.isInteger(size) || size < 1 || size > 0x1fffff) throw new RangeError(`size 範囲外: ${size}`);
  const sizeBytes = [(size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f];
  const body = [...addrBytes(a), ...sizeBytes];
  return [SYSEX_START, ROLAND_ID, DEVICE_ID, ...modelId, CMD_RQ1, ...body, rolandChecksum(body), SYSEX_END];
}

export type ParsedSysEx =
  | { kind: 'dt1'; modelId: number[]; addr: Addr; data: number[]; checksumOk: boolean }
  | { kind: 'rq1'; modelId: number[]; addr: Addr; size: number; checksumOk: boolean }
  | { kind: 'other'; reason: string };

/**
 * 受信 SysEx（F0…F7 を含む完全メッセージ）を解釈する。
 * modelId の長さは候補リスト（接続中プロファイル、または接続確認中は全対応機種）から前方一致で決める。
 */
export function parseSysEx(bytes: readonly number[], modelIdCandidates: readonly (readonly number[])[]): ParsedSysEx {
  if (bytes.length < 8 || bytes[0] !== SYSEX_START || bytes[bytes.length - 1] !== SYSEX_END) {
    return { kind: 'other', reason: 'F0/F7 不正' };
  }
  if (bytes[1] !== ROLAND_ID) return { kind: 'other', reason: 'Roland ID 以外' };
  if (bytes[2] !== DEVICE_ID) return { kind: 'other', reason: `Device ID 不一致: ${bytes[2]}` };
  const rest = bytes.slice(3, -1); // modelId … sum
  const match = modelIdCandidates.find((m) => m.length < rest.length && m.every((b, i) => rest[i] === b));
  if (!match) return { kind: 'other', reason: 'modelId 不一致' };
  const cmd = rest[match.length] ?? -1;
  const body = rest.slice(match.length + 1, -1);
  const sum = rest[rest.length - 1] ?? -1;
  if (body.length < 3) return { kind: 'other', reason: 'アドレス不足' };
  const checksumOk = rolandChecksum(body) === sum;
  const a = makeAddr(body[0] ?? 0, body[1] ?? 0, body[2] ?? 0);
  if (cmd === CMD_DT1) {
    if (body.length < 4) return { kind: 'other', reason: 'DT1 データ無し' };
    return { kind: 'dt1', modelId: [...match], addr: a, data: body.slice(3), checksumOk };
  }
  if (cmd === CMD_RQ1) {
    if (body.length !== 6) return { kind: 'other', reason: 'RQ1 サイズ不正' };
    const size = ((body[3] ?? 0) << 14) | ((body[4] ?? 0) << 7) | (body[5] ?? 0);
    return { kind: 'rq1', modelId: [...match], addr: a, size, checksumOk };
  }
  return { kind: 'other', reason: `未知のコマンド ${cmd.toString(16)}` };
}

export function toHex(bytes: readonly number[]): string {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

export function fromHex(hex: string): number[] {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length % 2 !== 0) throw new RangeError('16 進文字列の桁数が奇数');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
  return out;
}
