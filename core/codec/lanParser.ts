import { PROMPT_TEXT } from './TextCodec';

/**
 * LAN 受信バッファの切り出し（SPEC §3-4）。
 * - `;` または `\n` で 1 メッセージ
 * - 認証プロンプト `Enter password:` / `Welcome to {機種名}.` は区切り無しで来るので、それ自体を 1 メッセージとして切り出す（TCP 分割あり）
 * - 制御文字 stx(0x02) xon(0x11) xoff(0x13) `\r` は除去。ack(0x06) は区切りとして扱い ACK トークンを出す
 * - Telnet IAC（0xFF 始まりの 3 バイト）は破棄
 * 未完の末尾は次回へ持ち越す。
 */

export type LanToken = { kind: 'text'; text: string } | { kind: 'ack' };

const WELCOME_PREFIX = 'Welcome to ';
const ACK = '\x06';
const IAC = '\xff';
const DROP_RE = /[\x02\x11\x13\r]/g;

export class LanParser {
  private buf = '';

  /** 未処理の残り（診断用） */
  get pending(): string {
    return this.buf;
  }

  reset(): void {
    this.buf = '';
  }

  feed(chunk: string): LanToken[] {
    const out: LanToken[] = [];
    this.buf = stripIac(this.buf + chunk).replace(DROP_RE, '');

    for (;;) {
      this.buf = this.buf.replace(/^[ \t\n]+/, '');
      if (this.buf.length === 0) break;

      if (this.buf.startsWith(PROMPT_TEXT)) {
        out.push({ kind: 'text', text: PROMPT_TEXT });
        this.buf = this.buf.slice(PROMPT_TEXT.length);
        continue;
      }

      const sep = earliestSeparator(this.buf);

      if (this.buf.startsWith(WELCOME_PREFIX)) {
        const dot = this.buf.indexOf('.');
        if (dot >= 0 && (sep < 0 || dot < sep)) {
          out.push({ kind: 'text', text: this.buf.slice(0, dot + 1) });
          this.buf = this.buf.slice(dot + 1);
          continue;
        }
        if (sep < 0) break; // "Welcome to V" のような途中。次回へ持ち越し
      }

      if (sep < 0) break; // プロンプトの途中（"Enter pass"）か未完のメッセージ

      const seg = this.buf.slice(0, sep).trim();
      const ch = this.buf[sep];
      this.buf = this.buf.slice(sep + 1);
      if (seg.length > 0) out.push({ kind: 'text', text: seg });
      if (ch === ACK) out.push({ kind: 'ack' });
    }
    return out;
  }
}

function earliestSeparator(s: string): number {
  let best = -1;
  for (const c of [';', '\n', ACK]) {
    const i = s.indexOf(c);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  return best;
}

/** Telnet IAC（0xFF xx yy）の 3 バイトを捨てる。末尾で切れている IAC は持ち越す */
function stripIac(s: string): string {
  if (s.indexOf(IAC) < 0) return s;
  let out = '';
  for (let i = 0; i < s.length; ) {
    if (s[i] === IAC) {
      if (i + 3 > s.length) {
        out += s.slice(i);
        break;
      }
      i += 3;
      continue;
    }
    out += s[i];
    i += 1;
  }
  return out;
}
