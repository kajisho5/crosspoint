/**
 * 簡易制御コマンドの模擬（MockTransport と tools/mock-v160hd/server.ts で共用）。
 * 受け付けるのは本アプリが送るもの（CUT, ATO, MEM, MCREX, QMCRST, SEQSW, QSEQSW, SEQAS, QSEQAS, SEQPV, SEQNX, SEQJP, TLY, ACS）。
 * 戻り値は応答行の配列（`ACK` / `SQS:ON` など。末尾の `;` は付けない）。構文が違えば `ERR:0`。
 */
export interface SimHooks {
  swap: () => void;
  autoMs: () => number;
  later: (fn: () => void, ms: number) => void;
  loadMemory: (n: number) => void;
  tally: () => number[];
  seq: { get: () => { on: boolean; auto: boolean }; set: (v: { on?: boolean; auto?: boolean }) => void };
}

export function simulateSimpleCommand(text: string, h: SimHooks): string[] {
  const t = text.trim().replace(/;$/, '');
  if (t === 'CUT') {
    h.swap();
    return ['ACK'];
  }
  if (t === 'ATO') {
    h.later(() => h.swap(), Math.max(h.autoMs(), 5));
    return ['ACK'];
  }
  if (t === 'ACS') return ['ACK'];
  let m = /^MEM:MEMORY(\d+)$/.exec(t);
  if (m) {
    h.loadMemory(Number(m[1]));
    return ['ACK'];
  }
  m = /^MCREX:MACRO(\d+)$/.exec(t);
  if (m) {
    const n = Number(m[1]);
    return n >= 1 && n <= 100 ? ['ACK'] : ['ERR:5'];
  }
  m = /^QMCRST:MACRO(\d+)$/.exec(t);
  if (m) return [`MCRST:MACRO${m[1]},OFF`, 'ACK'];
  m = /^SEQSW:(ON|OFF)$/.exec(t);
  if (m) {
    h.seq.set({ on: m[1] === 'ON' });
    return ['ACK'];
  }
  if (t === 'QSEQSW') return [`SQS:${h.seq.get().on ? 'ON' : 'OFF'}`, 'ACK'];
  m = /^SEQAS:(ON|OFF)$/.exec(t);
  if (m) {
    h.seq.set({ auto: m[1] === 'ON' });
    return ['ACK'];
  }
  if (t === 'QSEQAS') return [`SQA:${h.seq.get().auto ? 'ON' : 'OFF'}`, 'ACK'];
  if (t === 'SEQPV' || /^SEQPV:[01]$/.test(t) || t === 'SEQNX' || /^SEQJP:(START|SEQ\d+)$/.test(t)) return ['ACK'];
  if (t === 'TLY') return [`TLY:${h.tally().join(',')}`, 'ACK'];
  return ['ERR:0'];
}
