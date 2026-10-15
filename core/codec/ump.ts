/**
 * UMP（Universal MIDI Packet）SysEx7 の分割・再結合（SPEC §7-2）。
 * ネイティブ側（Swift）と同じ規則の参照実装で、単体テストの期待値にも使う。
 *
 * word0: bit28–31 = 0x3（Message Type: Data 64bit）、bit24–27 = group
 *        bit20–23 = status（0=complete, 1=start, 2=continue, 3=end）
 *        bit16–19 = バイト数（0–6）、続く 6 バイトがデータ（word0 下位 16bit ＋ word1 32bit）
 * SysEx の F0 / F7 は UMP には含めない。
 */

export const UMP_SYSEX7_TYPE = 0x3;

export type UmpWords = [number, number];

/** F0…F7 を含む完全 SysEx → UMP ワード列（group 0） */
export function sysexToUmp(sysex: readonly number[], group = 0): UmpWords[] {
  if (sysex.length < 2 || sysex[0] !== 0xf0 || sysex[sysex.length - 1] !== 0xf7) {
    throw new RangeError('F0…F7 の完全な SysEx ではない');
  }
  const payload = sysex.slice(1, -1);
  const out: UmpWords[] = [];
  const chunks = Math.max(1, Math.ceil(payload.length / 6));
  for (let c = 0; c < chunks; c += 1) {
    const chunk = payload.slice(c * 6, c * 6 + 6);
    const status = chunks === 1 ? 0 : c === 0 ? 1 : c === chunks - 1 ? 3 : 2;
    out.push(packWords(group, status, chunk));
  }
  return out;
}

function packWords(group: number, status: number, chunk: readonly number[]): UmpWords {
  const b = [...chunk, 0, 0, 0, 0, 0, 0].slice(0, 6).map((x) => x & 0x7f) as [number, number, number, number, number, number];
  const word0 = ((UMP_SYSEX7_TYPE << 28) | ((group & 0xf) << 24) | ((status & 0xf) << 20) | ((chunk.length & 0xf) << 16) | (b[0] << 8) | b[1]) >>> 0;
  const word1 = ((b[2] << 24) | (b[3] << 16) | (b[4] << 8) | b[5]) >>> 0;
  return [word0, word1];
}

export function umpToHex(words: readonly UmpWords[]): string[] {
  return words.map(([w0, w1]) => `${w0.toString(16).padStart(8, '0')} ${w1.toString(16).padStart(8, '0')}`);
}

/**
 * UMP ワード列から SysEx を再結合する。
 * start〜end を連結し F0 / F7 を付けて完成メッセージを返す。end が来る前に新しい start が来たら前のバッファを破棄。
 * SysEx7 以外のメッセージタイプは無視する。
 */
export class UmpSysExAssembler {
  private buf: number[] | null = null;

  feed(words: readonly UmpWords[]): number[][] {
    const done: number[][] = [];
    for (const [w0, w1] of words) {
      const type = (w0 >>> 28) & 0xf;
      if (type !== UMP_SYSEX7_TYPE) continue;
      const status = (w0 >>> 20) & 0xf;
      const n = Math.min(6, (w0 >>> 16) & 0xf);
      const data = [(w0 >>> 8) & 0x7f, w0 & 0x7f, (w1 >>> 24) & 0x7f, (w1 >>> 16) & 0x7f, (w1 >>> 8) & 0x7f, w1 & 0x7f].slice(0, n);
      switch (status) {
        case 0:
          this.buf = null;
          done.push([0xf0, ...data, 0xf7]);
          break;
        case 1:
          this.buf = [...data];
          break;
        case 2:
          if (this.buf) this.buf.push(...data);
          break;
        case 3:
          if (this.buf) {
            this.buf.push(...data);
            done.push([0xf0, ...this.buf, 0xf7]);
            this.buf = null;
          }
          break;
        default:
          break;
      }
    }
    return done;
  }

  reset(): void {
    this.buf = null;
  }
}
