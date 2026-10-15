import { addrToHex } from '@/core/codec/value';
import { getProfile, profileFromVerName } from '@/core/profiles';

const v160 = getProfile('V-160HD');
const v80 = getProfile('V-80HD');

describe('V-160HD プロファイル（SPEC §9-1〜§9-3）', () => {
  test('PGM 値 logical20：INPUT n → 0x1F+n', () => {
    expect(v160.encodeInput(1)).toBe(0x20);
    expect(v160.encodeInput(20)).toBe(0x33);
  });

  test('PGM 値デコード：logical20 と物理入力の逆引き', () => {
    const assign = (n: number) => (n === 3 ? 0x02 : undefined);
    expect(v160.decodeInput(0x20, assign)).toBe(1);
    expect(v160.decodeInput(0x33, assign)).toBe(20);
    expect(v160.decodeInput(0x02, assign)).toBe(3);
    expect(v160.decodeInput(0x05, assign)).toBeNull();
    expect(v160.decodeInput(0x40, assign)).toBeNull();
  });

  test('アドレス', () => {
    expect(addrToHex(v160.addrs.pgm)).toBe('002100');
    expect(addrToHex(v160.addrs.inputAssign(10))).toBe('000009');
    expect(addrToHex(v160.addrs.inputAssign(11))).toBe('000024');
    expect(addrToHex(v160.addrs.inputAssign(20))).toBe('00002D');
    expect(addrToHex(v160.addrs.pinp(4).pgm)).toBe('001E00');
    expect(addrToHex(v160.addrs.pinp(2).time)).toBe('001702');
    expect(addrToHex(v160.addrs.dsk(2).pvw)).toBe('002001');
    expect(addrToHex(v160.addrs.dsk(1).time)).toBe('001705');
    expect(addrToHex(v160.addrs.audioLevel(0x14))).toBe('011403');
    expect(addrToHex(v160.addrs.memName(30))).toBe('601D00');
    expect(v160.addrs.cut && addrToHex(v160.addrs.cut)).toBe('0B001E');
    expect(v160.addrs.auto && addrToHex(v160.addrs.auto)).toBe('0B001F');
  });

  test('タリー（ビットマスク 0–3、XPT は index 32–41）', () => {
    const bytes = new Array<number>(42).fill(0);
    bytes[32] = 1;
    bytes[33] = 2;
    bytes[34] = 3;
    expect(v160.tallyOf(1, bytes)).toBe('pgm');
    expect(v160.tallyOf(2, bytes)).toBe('pst');
    expect(v160.tallyOf(3, bytes)).toBe('both');
    expect(v160.tallyOf(4, bytes)).toBe('off');
    expect(v160.tallyOf(11, bytes)).toBe('off');
  });

  test('ソースとオーディオ数', () => {
    expect(v160.sources).toHaveLength(32);
    expect(v160.audioInputs).toHaveLength(21);
    expect(v160.capabilities.cutAuto).toBe(true);
  });
});

describe('V-80HD プロファイル（SPEC §9-4・§9-5）', () => {
  test('PGM 値：INPUT n → 0x28+n（ガイド例 INPUT 2 = 2A）', () => {
    expect(v80.encodeInput(2)).toBe(0x2a);
    expect(v80.decodeInput(0x2a, () => undefined)).toBe(2);
    expect(v80.decodeInput(0x38, () => undefined)).toBe(16);
  });

  test('アドレス', () => {
    expect(addrToHex(v80.addrs.pgm)).toBe('001500');
    expect(addrToHex(v80.addrs.fader)).toBe('001502');
    expect(addrToHex(v80.addrs.transTime)).toBe('000F02');
    expect(addrToHex(v80.addrs.pinp(2).source)).toBe('001303');
    expect(addrToHex(v80.addrs.dsk(1).source)).toBe('001404');
    const dskType = v80.addrs.dsk(1).type;
    expect(dskType === undefined ? null : addrToHex(dskType)).toBe('001406');
    expect(addrToHex(v80.addrs.audioLevel(0x0f))).toBe('010F03');
    expect(addrToHex(v80.addrs.split(2))).toBe('001100');
  });

  test('タリー：1byte ずつ 00/01/02、INPUT は 0x28+n', () => {
    const bytes = new Array<number>(57).fill(0);
    bytes[0x29] = 1;
    bytes[0x2a] = 2;
    expect(v80.tallyOf(1, bytes)).toBe('pgm');
    expect(v80.tallyOf(2, bytes)).toBe('pst');
    expect(v80.tallyOf(3, bytes)).toBe('off');
  });

  test('capabilities：CUT/AUTO・USB・BLE は無効、件数', () => {
    expect(v80.capabilities).toEqual({ cutAuto: false, tallySubscribe: false, usb: false, ble: false, split: true });
    expect(v80.addrs.cut).toBeNull();
    expect(v80.addrs.auto).toBeNull();
    expect([v80.inputCount, v80.bankSize, v80.columns, v80.memoryCount, v80.pinpCount, v80.dskCount]).toEqual([16, 8, 4, 32, 2, 1]);
    expect(v80.memoryNoun).toBe('シーン');
    expect(v80.audioInputs).toHaveLength(15);
  });
});

test('VER 名からプロファイル選択', () => {
  expect(profileFromVerName('V-160HD')?.model).toBe('V-160HD');
  expect(profileFromVerName('V-80HD')?.model).toBe('V-80HD');
  expect(profileFromVerName('VR-120HD')).toBeNull();
});
