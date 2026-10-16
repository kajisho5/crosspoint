import type { ModelId } from '../profiles/types';

/**
 * LAN/RS-232 簡易制御コマンド（Roland「LAN/RS-232 簡易制御コマンド」Ver.02、2025）【事実：公式公開資料】
 *  - 形式：`CMD:param,param;`（ASCII）。応答は `ACK;` または `XXX:...;ACK;`、末尾に LF
 *  - 対象：V-160HD Ver.3.5 以降 / V-80HD Ver.1.3 以降 / VR-120HD Ver.2.2 以降 / VR-6HD Ver.2.2 以降 / V-1-4K Ver.1.0 以降
 *  - マクロ（MCREX / QMCRST）・シーケンサー（SEQ*）は「(V-160HD/V-80HD/VR-120HD/VR-6HD)」限定。V-1-4K には無い【事実：文書 p.41–43】
 *  - LAN / RS-232 のみ。USB / Bluetooth（MIDI SysEx）では使えない
 * ここでは本アプリが使う分だけを組み立てる（CUT / AUTO / マクロ / シーケンサー / シーンメモリー / タリー取得）。
 */

export const SIMPLE_COMMANDS_MIN_VERSION: Record<ModelId, string> = {
  'V-160HD': '3.50',
  'V-80HD': '1.30',
  'VR-120HD': '2.20',
  // 文書の表紙（掲載順）：VR-6HD は Version 2.2 and later、V-1-4K は Version 1.0 and later【推測：表紙の対応】
  'VR-6HD': '2.20',
  'V-1-4K': '1.00',
  // LAN を持たない機種（簡易制御コマンドは使えない。経路判定は transport で弾かれる）
  'V-8HD': '99.99',
  'V-1HD': '99.99',
  'V-1SDI': '99.99',
  'VR-4HD': '99.99',
  'V-02HD-MK2': '99.99',
};

/** マクロ・シーケンサーの簡易制御コマンドを持つ機種（文書の限定注記） */
export const SIMPLE_MACRO_MODELS: ReadonlySet<ModelId> = new Set<ModelId>(['V-160HD', 'V-80HD', 'VR-120HD', 'VR-6HD']);

/** "3.60" のような版文字列を比較（major.minor のみ。数値化できなければ true＝使ってみる） */
export function supportsSimpleCommands(model: ModelId, version: string | null): boolean {
  const min = SIMPLE_COMMANDS_MIN_VERSION[model];
  if (!version) return true;
  const a = parseVersion(version);
  const b = parseVersion(min);
  if (a == null || b == null) return true;
  return a >= b;
}

function parseVersion(v: string): number | null {
  const m = /^(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return Number(m[1]) * 1000 + Number(m[2]);
}

/** CUT で切替（SPLIT OFF のとき有効） */
export const CMD_CUT = 'CUT;';
/** AUTO で切替（TRANSITION TIME に従う） */
export const CMD_AUTO = 'ATO;';
/** タリー取得 → `TLY:a0,a1,…;ACK;`（0 OFF / 1 PGM / 2 PST / 3 両方） */
export const CMD_TALLY = 'TLY;';
/** シーケンサー ON/OFF 状態取得 → `SQS:OFF|ON;ACK;` */
export const CMD_SEQ_QUERY = 'QSEQSW;';
/** Auto Sequence 状態取得 → `SQA:OFF|ON;ACK;` */
export const CMD_SEQ_AUTO_QUERY = 'QSEQAS;';

export function cmdMacroExec(n: number): string {
  return `MCREX:MACRO${clamp(n, 1, 100)};`;
}
/** マクロ実行中か → `MCRST:MACROn,OFF|ON;ACK;` */
export function cmdMacroQuery(n: number): string {
  return `QMCRST:MACRO${clamp(n, 1, 100)};`;
}
export function cmdSeqSw(on: boolean): string {
  return `SEQSW:${on ? 'ON' : 'OFF'};`;
}
export function cmdSeqAuto(on: boolean): string {
  return `SEQAS:${on ? 'ON' : 'OFF'};`;
}
/** 1 つ戻す（toStart=true で先頭へ） */
export function cmdSeqPrev(toStart = false): string {
  return toStart ? 'SEQPV:1;' : 'SEQPV;';
}
export const CMD_SEQ_NEXT = 'SEQNX;';
export function cmdSeqJump(n: number | 'START'): string {
  return n === 'START' ? 'SEQJP:START;' : `SEQJP:SEQ${clamp(n, 1, 1000)};`;
}
export function cmdMemoryLoad(n: number): string {
  return `MEM:MEMORY${clamp(n, 1, 32)};`;
}

/** 応答テキストの軽い解釈（`SQS:ON` / `SQA:OFF` / `MCRST:MACRO3,ON` / `TLY:0,1,2`）。該当しなければ null */
export type SimpleReply = { kind: 'seqSw'; on: boolean } | { kind: 'seqAuto'; on: boolean } | { kind: 'macroState'; n: number; on: boolean } | { kind: 'tally'; states: number[] };

export function parseSimpleReply(text: string): SimpleReply | null {
  const t = text.trim().replace(/;$/, '');
  let m = /^SQS:(ON|OFF)$/.exec(t);
  if (m) return { kind: 'seqSw', on: m[1] === 'ON' };
  m = /^SQA:(ON|OFF)$/.exec(t);
  if (m) return { kind: 'seqAuto', on: m[1] === 'ON' };
  m = /^MCRST:MACRO(\d+),(ON|OFF)$/.exec(t);
  if (m) return { kind: 'macroState', n: Number(m[1]), on: m[2] === 'ON' };
  m = /^TLY:([0-3](,[0-3])*)$/.exec(t);
  if (m) return { kind: 'tally', states: (m[1] ?? '').split(',').map(Number) };
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
