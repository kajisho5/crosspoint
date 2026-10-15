/** ログの時刻（HH:MM:SS.mmm、端末のローカル時刻） */
export function formatTs(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

/** 16 進文字列（空白区切り可）→ 7bit バイト列。不正なら null */
export function parseHexBytes(text: string): number[] | null {
  const compact = text.replace(/[\s,]/g, '');
  if (compact.length === 0 || compact.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(compact)) return null;
  const out: number[] = [];
  for (let i = 0; i < compact.length; i += 2) out.push(parseInt(compact.slice(i, i + 2), 16));
  return out.every((b) => b <= 0x7f) ? out : null;
}
