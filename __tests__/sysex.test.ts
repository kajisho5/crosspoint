import { buildDt1, buildRq1, fromHex, parseSysEx, rolandChecksum, toHex } from '@/core/codec/SysExCodec';
import { sysexToUmp, umpToHex, UmpSysExAssembler } from '@/core/codec/ump';
import { addr, encodeU14 } from '@/core/codec/value';
import { v160hd } from '@/core/profiles/v160hd';
import { v80hd } from '@/core/profiles/v80hd';

const M160 = v160hd.sysexModelId;
const M80 = v80hd.sysexModelId;

describe('SysExCodec（SPEC §4-2 テストベクタ：V-160HD）', () => {
  test.each<[string, number[], string]>([
    ['PGM=01（ガイド記載例）', buildDt1(M160, addr(0x00, 0x21, 0x00), [0x01]), 'F0 41 10 00 00 00 00 02 12 00 21 00 01 5E F7'],
    ['PGM=0x22 (INPUT 3)', buildDt1(M160, addr(0x00, 0x21, 0x00), [0x22]), 'F0 41 10 00 00 00 00 02 12 00 21 00 22 3D F7'],
    ['CUT 押下', buildDt1(M160, addr(0x0b, 0x00, 0x1e), [0x01]), 'F0 41 10 00 00 00 00 02 12 0B 00 1E 01 56 F7'],
    ['CUT 解放', buildDt1(M160, addr(0x0b, 0x00, 0x1e), [0x00]), 'F0 41 10 00 00 00 00 02 12 0B 00 1E 00 57 F7'],
    ['AUTO 押下', buildDt1(M160, addr(0x0b, 0x00, 0x1f), [0x01]), 'F0 41 10 00 00 00 00 02 12 0B 00 1F 01 55 F7'],
    ['Tバー 1024', buildDt1(M160, addr(0x00, 0x21, 0x02), encodeU14(1024)), 'F0 41 10 00 00 00 00 02 12 00 21 02 08 00 55 F7'],
    ['RQ1 PGM/PST 2byte', buildRq1(M160, addr(0x00, 0x21, 0x00), 2), 'F0 41 10 00 00 00 00 02 11 00 21 00 00 00 02 5D F7'],
    ['RQ1 バージョン 6byte', buildRq1(M160, addr(0x02, 0x00, 0x00), 6), 'F0 41 10 00 00 00 00 02 11 02 00 00 00 00 06 78 F7'],
    ['RQ1 タリー 16byte', buildRq1(M160, addr(0x0c, 0x00, 0x00), 16), 'F0 41 10 00 00 00 00 02 11 0C 00 00 00 00 10 64 F7'],
    ['タリー購読', buildDt1(M160, addr(0x0c, 0x01, 0x00), [0x01]), 'F0 41 10 00 00 00 00 02 12 0C 01 00 01 72 F7'],
    ['メモリー7 呼出し', buildDt1(M160, addr(0x0a, 0x00, 0x00), [0x06]), 'F0 41 10 00 00 00 00 02 12 0A 00 00 06 70 F7'],
  ])('%s', (_name, bytes, expected) => {
    expect(toHex(bytes)).toBe(expected);
  });
});

describe('SysExCodec（SPEC §4-2 テストベクタ：V-80HD）', () => {
  test.each<[string, number[], string]>([
    ['PGM=Input 2（Guide 記載例）', buildDt1(M80, addr(0x00, 0x15, 0x00), [0x2a]), 'F0 41 10 01 05 14 12 00 15 00 2A 41 F7'],
    ['PGM=Input 1', buildDt1(M80, addr(0x00, 0x15, 0x00), [0x29]), 'F0 41 10 01 05 14 12 00 15 00 29 42 F7'],
    ['Tバー 1024', buildDt1(M80, addr(0x00, 0x15, 0x02), encodeU14(1024)), 'F0 41 10 01 05 14 12 00 15 02 08 00 61 F7'],
    ['RQ1 PGM/PST 2byte', buildRq1(M80, addr(0x00, 0x15, 0x00), 2), 'F0 41 10 01 05 14 11 00 15 00 00 00 02 69 F7'],
    ['RQ1 バージョン 6byte', buildRq1(M80, addr(0x02, 0x00, 0x00), 6), 'F0 41 10 01 05 14 11 02 00 00 00 00 06 78 F7'],
    ['RQ1 タリー 57byte', buildRq1(M80, addr(0x0c, 0x00, 0x00), 57), 'F0 41 10 01 05 14 11 0C 00 00 00 00 39 3B F7'],
    ['シーン7 呼出し', buildDt1(M80, addr(0x0a, 0x00, 0x00), [0x06]), 'F0 41 10 01 05 14 12 0A 00 00 06 70 F7'],
  ])('%s', (_name, bytes, expected) => {
    expect(toHex(bytes)).toBe(expected);
  });
});

describe('SysEx 解釈', () => {
  const candidates = [M160, M80];

  test('DT1 を解釈し modelId の長さを候補から決める', () => {
    const r = parseSysEx(fromHex('F0 41 10 00 00 00 00 02 12 00 21 00 22 3D F7'), candidates);
    expect(r).toEqual({ kind: 'dt1', modelId: [...M160], addr: addr(0x00, 0x21, 0x00), data: [0x22], checksumOk: true });
    const r80 = parseSysEx(fromHex('F0 41 10 01 05 14 12 00 15 00 2A 41 F7'), candidates);
    expect(r80).toEqual({ kind: 'dt1', modelId: [...M80], addr: addr(0x00, 0x15, 0x00), data: [0x2a], checksumOk: true });
  });

  test('RQ1 を解釈', () => {
    const r = parseSysEx(fromHex('F0 41 10 00 00 00 00 02 11 0C 00 00 00 00 10 64 F7'), candidates);
    expect(r).toEqual({ kind: 'rq1', modelId: [...M160], addr: addr(0x0c, 0x00, 0x00), size: 16, checksumOk: true });
  });

  test('チェックサム不一致は checksumOk=false', () => {
    const r = parseSysEx(fromHex('F0 41 10 00 00 00 00 02 12 00 21 00 22 3E F7'), candidates);
    expect(r.kind).toBe('dt1');
    if (r.kind === 'dt1') expect(r.checksumOk).toBe(false);
  });

  test('他社 ID・modelId 不一致・不正長は other', () => {
    expect(parseSysEx(fromHex('F0 43 10 00 12 F7'), candidates).kind).toBe('other');
    expect(parseSysEx(fromHex('F0 41 10 00 00 00 00 25 12 00 1B 00 01 00 F7'), candidates).kind).toBe('other');
    expect(parseSysEx([0xf0, 0x41], candidates).kind).toBe('other');
  });

  test('チェックサムの式', () => {
    expect(rolandChecksum([0x00, 0x21, 0x00, 0x01])).toBe(0x5e);
    expect(rolandChecksum([])).toBe(0);
    expect(rolandChecksum([0x7f, 0x01])).toBe(0);
  });
});

describe('UMP SysEx7（SPEC §7-2）', () => {
  test('RQ1 PGM/PST（15byte）の送信ベクタ', () => {
    const words = sysexToUmp(fromHex('F0 41 10 00 00 00 00 02 11 00 21 00 00 00 02 5D F7'));
    expect(umpToHex(words)).toEqual(['30164110 00000000', '30260211 00210000', '30330002 5d000000']);
  });

  test.each([6, 7, 12, 13, 1, 20])('%i byte の分割→結合で元に戻る', (n) => {
    const payload = Array.from({ length: n }, (_, i) => (i * 7 + 3) & 0x7f);
    const sysex = [0xf0, ...payload, 0xf7];
    const words = sysexToUmp(sysex);
    expect(words.length).toBe(Math.max(1, Math.ceil(n / 6)));
    const asm = new UmpSysExAssembler();
    expect(asm.feed(words)).toEqual([sysex]);
  });

  test('6byte 以下は complete（status 0）1 パケット', () => {
    const words = sysexToUmp([0xf0, 0x41, 0x10, 0xf7]);
    expect(words.length).toBe(1);
    const w0 = words[0]?.[0] ?? 0;
    expect((w0 >>> 20) & 0xf).toBe(0);
    expect((w0 >>> 16) & 0xf).toBe(2);
  });

  test('end 前に新しい start が来たら前のバッファを破棄', () => {
    const a = sysexToUmp([0xf0, 1, 2, 3, 4, 5, 6, 7, 8, 0xf7]);
    const b = sysexToUmp([0xf0, 9, 9, 9, 9, 9, 9, 9, 0xf7]);
    const asm = new UmpSysExAssembler();
    expect(asm.feed([a[0]!, b[0]!, b[1]!])).toEqual([[0xf0, 9, 9, 9, 9, 9, 9, 9, 0xf7]]);
  });

  test('SysEx7 以外のメッセージタイプは無視', () => {
    const asm = new UmpSysExAssembler();
    expect(asm.feed([[0x20903c40, 0]])).toEqual([]);
  });
});
