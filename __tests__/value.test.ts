import {
  addr,
  addrBytes,
  addrOffset,
  addrToHex,
  decodeAscii8,
  decodeLevel,
  decodeS14,
  decodeS21,
  decodeTime,
  decodeU14,
  encodeAscii8,
  encodeLevel,
  encodeS14,
  encodeS21,
  encodeTime,
  encodeU14,
  encodeU7,
  formatDb,
  hexToAddr,
} from '@/core/codec/value';

describe('SPEC §2-1 値エンコード', () => {
  test('Tバー 1024 → 08 00', () => {
    expect(encodeU14(1024)).toEqual([0x08, 0x00]);
    expect(decodeU14([0x08, 0x00])).toBe(1024);
    expect(encodeU14(2047)).toEqual([0x0f, 0x7f]);
  });

  test('DIGITAL GAIN −42.0dB（−420）→ 7C 5C', () => {
    expect(encodeS14(-420)).toEqual([0x7c, 0x5c]);
    expect(decodeS14([0x7c, 0x5c])).toBe(-420);
  });

  test('LEVEL −80.0dB（−800）→ 7F 79 60', () => {
    expect(encodeS21(-800)).toEqual([0x7f, 0x79, 0x60]);
    expect(decodeS21([0x7f, 0x79, 0x60])).toBe(-800);
    expect(encodeLevel(-80)).toEqual([0x7f, 0x79, 0x60]);
  });

  test('LEVEL −6.0dB → 7F 7F 44', () => {
    expect(encodeLevel(-6)).toEqual([0x7f, 0x7f, 0x44]);
    expect(decodeLevel([0x7f, 0x7f, 0x44])).toBe(-6);
  });

  test('−INF = 7E 00 00', () => {
    expect(encodeLevel(null)).toEqual([0x7e, 0x00, 0x00]);
    expect(decodeLevel([0x7e, 0x00, 0x00])).toBeNull();
  });

  test('LEVEL は −80.0〜+10.0 にクランプ', () => {
    expect(decodeLevel(encodeLevel(12))).toBe(10);
    expect(decodeLevel(encodeLevel(-95))).toBe(-80);
    expect(decodeLevel(encodeLevel(0))).toBe(0);
  });

  test('範囲外は例外', () => {
    expect(() => encodeU7(0x80)).toThrow(RangeError);
    expect(() => encodeU14(0x4000)).toThrow(RangeError);
    expect(() => encodeS14(-0x2001)).toThrow(RangeError);
  });

  test('テキスト 8 文字：末尾スペース除去・非 ASCII はスペース', () => {
    expect(encodeAscii8('CAM 1')).toEqual([0x43, 0x41, 0x4d, 0x20, 0x31, 0x20, 0x20, 0x20]);
    expect(decodeAscii8(encodeAscii8('CAM 1'))).toBe('CAM 1');
    expect(decodeAscii8(encodeAscii8('ABCDEFGHIJ'))).toBe('ABCDEFGH');
    expect(encodeAscii8('é')[0]).toBe(0x20);
  });

  test('トランジション時間 00–28 ↔ 0.0–4.0s', () => {
    expect(encodeTime(1)).toEqual([0x0a]);
    expect(encodeTime(4)).toEqual([0x28]);
    expect(encodeTime(9)).toEqual([0x28]);
    expect(decodeTime([0x05])).toBe(0.5);
  });

  test('formatDb は U+2212 マイナス', () => {
    expect(formatDb(-6)).toBe('−6.0');
    expect(formatDb(0)).toBe('0.0');
    expect(formatDb(null)).toBe('−INF');
  });
});

describe('アドレス', () => {
  test('hex 往復', () => {
    expect(addrToHex(addr(0x00, 0x21, 0x00))).toBe('002100');
    expect(hexToAddr('0B001E')).toBe(addr(0x0b, 0x00, 0x1e));
    expect(addrBytes(hexToAddr('602900'))).toEqual([0x60, 0x29, 0x00]);
  });

  test('7bit 桁上がり（SPEC §8-3）', () => {
    expect(addrToHex(addrOffset(hexToAddr('00217F'), 1))).toBe('002200');
    expect(addrToHex(addrOffset(hexToAddr('007F7F'), 1))).toBe('010000');
  });

  test('不正なアドレスは例外', () => {
    expect(() => hexToAddr('008000')).toThrow(RangeError);
    expect(() => hexToAddr('0021')).toThrow(RangeError);
  });
});
