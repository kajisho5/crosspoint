import { addrToHex, hexToAddr, type Addr } from './value';

/**
 * LAN（TCP）テキストコマンドの組立てと、受信メッセージ 1 件の解釈（SPEC §3-3・§3-4）。
 * 分割受信・区切りの切り出しは lanParser.ts が担当し、ここは「切り出し済みの 1 メッセージ」だけを扱う。
 */

export const VER_COMMAND = 'VER;\n';

function hex2(b: number): string {
  if (!Number.isInteger(b) || b < 0 || b > 0x7f) throw new RangeError(`7bit 範囲外: ${b}`);
  return b.toString(16).toUpperCase().padStart(2, '0');
}

/** `DTH:{addr6},{valueHex};\n`（1 バイト） */
export function formatDth(a: Addr, byte: number): string {
  return `DTH:${addrToHex(a)},${hex2(byte)};\n`;
}

/**
 * 複数バイトは区切り無しで連結して 1 通で送る（`DTH:010A01,7E58;`。RQH 応答と同じ形）。
 * 1 バイトずつ別アドレスで送ると V-80HD（FW 1.30.207）は ACK を返すが値を変えない【事実：2026-10-16 実機。docs/VERIFY.md】
 */
export function formatDthBytes(a: Addr, bytes: readonly number[]): string[] {
  if (bytes.length === 0) return [];
  return [`DTH:${addrToHex(a)},${bytes.map(hex2).join('')};\n`];
}

/** `RQH:{addr6},{size6};\n` */
export function formatRqh(a: Addr, size: number): string {
  if (!Number.isInteger(size) || size < 1 || size > 0xffffff) throw new RangeError(`size 範囲外: ${size}`);
  return `RQH:${addrToHex(a)},${size.toString(16).toUpperCase().padStart(6, '0')};\n`;
}

export type LanMessage =
  | { type: 'dth'; addr: Addr; bytes: number[] }
  | { type: 'ver'; model: string; version: string }
  | { type: 'err'; code: number }
  | { type: 'ack' }
  | { type: 'prompt' }
  | { type: 'welcome'; model: string }
  | { type: 'unknown'; raw: string };

export const PROMPT_TEXT = 'Enter password:';
const WELCOME_RE = /^Welcome to (.+?)\.?$/;
const DTH_RE = /^DTH:([0-9A-Fa-f]{6}),([0-9A-Fa-f]*)$/;
const VER_RE = /^VER:([^,]+),(.*)$/;
const ERR_RE = /^ERR:(\d+)$/;

/** 切り出し済み 1 メッセージ（trim 済み）を解釈する */
export function parseLanMessage(raw: string): LanMessage {
  const msg = raw.trim();
  if (msg === 'ACK') return { type: 'ack' };
  if (msg === PROMPT_TEXT) return { type: 'prompt' };
  const w = WELCOME_RE.exec(msg);
  if (w) return { type: 'welcome', model: (w[1] ?? '').trim() };
  const d = DTH_RE.exec(msg);
  if (d) {
    const addrHex = d[1] ?? '';
    const hex = d[2] ?? '';
    if (hex.length % 2 !== 0) return { type: 'unknown', raw: msg };
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    if (bytes.some((b) => b > 0x7f)) return { type: 'unknown', raw: msg };
    try {
      return { type: 'dth', addr: hexToAddr(addrHex), bytes };
    } catch {
      return { type: 'unknown', raw: msg };
    }
  }
  const v = VER_RE.exec(msg);
  if (v) return { type: 'ver', model: (v[1] ?? '').trim(), version: (v[2] ?? '').trim() };
  const e = ERR_RE.exec(msg);
  if (e) return { type: 'err', code: Number(e[1] ?? 0) };
  return { type: 'unknown', raw: msg };
}

export const ERR_TEXT: Record<number, string> = {
  0: '構文エラー',
  4: '無効（他の設定で無効化中）',
  5: '範囲外',
  6: 'stx なし（RS-232）',
};
