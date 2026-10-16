import { addr, addrToHex } from '@/core/codec/value';
import { getProfile, profileFromVerName } from '@/core/profiles';

const v160 = getProfile('V-160HD');
const v80 = getProfile('V-80HD');
const vr120hd = getProfile('VR-120HD');

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
    expect(addrToHex(v160.addrs.inputAssign!(10))).toBe('000009');
    expect(addrToHex(v160.addrs.inputAssign!(11))).toBe('000024');
    expect(addrToHex(v160.addrs.inputAssign!(20))).toBe('00002D');
    expect(addrToHex(v160.addrs.pinp(4).pgm)).toBe('001E00');
    expect(addrToHex(v160.addrs.pinp(2).time!)).toBe('001702');
    expect(addrToHex(v160.addrs.dsk(2).pvw!)).toBe('002001');
    expect(addrToHex(v160.addrs.dsk(1).time!)).toBe('001705');
    expect(addrToHex(v160.addrs.audioLevel(0x14))).toBe('011403');
    expect(addrToHex(v160.addrs.memName!(30))).toBe('601D00');
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
    expect(addrToHex(v80.addrs.fader!)).toBe('001502');
    expect(addrToHex(v80.addrs.transTime)).toBe('000F02');
    expect(addrToHex(v80.addrs.pinp(2).source!)).toBe('001303');
    expect(addrToHex(v80.addrs.dsk(1).source!)).toBe('001404');
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

  test('capabilities：CUT/AUTO は無効、USB・BLE は有効（公式 Remote Connection Guide）、件数', () => {
    expect(v80.capabilities).toEqual({ cutAuto: false, tallySubscribe: false, usb: true, ble: true, split: true, macro: false, sequencer: false });
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
  expect(profileFromVerName('VR-120HD')?.model).toBe('VR-120HD');
  expect(profileFromVerName('V-1HD')?.model).toBe('V-1HD');
  expect(profileFromVerName('V-999HD')).toBeNull();
});

describe('VR-120HD プロファイル（リモート・コントロール・ガイド 日本語版 04 / Ver.2.00）', () => {
  const p = vr120hd;
  test('識別：Model ID 00 00 00 00 25、PW 4 桁、ack 06H', () => {
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x00, 0x25]);
    expect(p.passwordLength).toBe(4);
    expect(p.lanAck).toBe('byte06');
    expect(p.verName).toBe('VR-120HD');
  });
  test('PGM 値：Input n → 1CH+n（Input 1 = 1DH）、ソース直指定は割当から逆引き', () => {
    expect(p.encodeInput(1)).toBe(0x1d);
    expect(p.encodeInput(8)).toBe(0x24);
    expect(p.decodeInput(0x1f, () => undefined)).toBe(3);
    expect(p.decodeInput(0x06, (n) => (n === 2 ? 0x06 : 0))).toBe(2); // SDI In 1 を INPUT 2 に割当
    expect(p.decodeInput(0x25, () => undefined)).toBeNull();
  });
  test('アドレス（ガイド p.3–38）', () => {
    expect(p.addrs.pgm).toBe(addr(0x00, 0x1b, 0x00));
    expect(p.addrs.pst!).toBe(addr(0x00, 0x1b, 0x01));
    expect(p.addrs.fader!).toBe(addr(0x00, 0x1b, 0x02));
    expect(p.addrs.transType!).toBe(addr(0x00, 0x14, 0x00));
    expect(p.addrs.transTime).toBe(addr(0x00, 0x14, 0x02));
    expect(p.addrs.inputAssign!(8)).toBe(addr(0x00, 0x00, 0x07));
    expect(p.addrs.pinp(4).pgm).toBe(addr(0x00, 0x18, 0x01));
    expect(p.addrs.dsk(2).source!).toBe(addr(0x00, 0x1a, 0x04));
    expect(p.addrs.dsk(2).type).toBe(addr(0x00, 0x1a, 0x06));
    expect(p.addrs.split(1)).toBe(addr(0x00, 0x14, 0x08));
    expect(p.addrs.split(2)).toBe(addr(0x00, 0x14, 0x12));
    expect(p.addrs.audioLevel(0x0c)).toBe(addr(0x01, 0x0c, 0x03)); // HDMI In 1
    expect(p.addrs.masterLevel).toBe(addr(0x01, 0x21, 0x00));
    expect(p.addrs.masterMute!).toBe(addr(0x01, 0x21, 0x03));
    expect(p.addrs.memLoad).toBe(addr(0x0a, 0x00, 0x00));
    expect(p.addrs.memCurrent!).toBe(addr(0x0a, 0x00, 0x03));
    expect(p.addrs.memName!(32)).toBe(addr(0x60, 0x1f, 0x00));
    expect(p.sources.find((s) => s.name === 'SDI 1')?.labelAddr).toBe(addr(0x02, 0x26, 0x00));
    expect(p.sources.find((s) => s.name === 'STILL 16')?.labelAddr).toBe(addr(0x02, 0x3b, 0x00));
    expect(p.sources.find((s) => s.name === 'VP/SRT')).toMatchObject({ code: 0x1c, labelAddr: addr(0x02, 0x43, 0x00) });
  });
  test('タリー：0C 00 00 から 37 バイト、Input n は 1CH+n', () => {
    expect(p.addrs.tallyBlock!).toBe(addr(0x0c, 0x00, 0x00));
    expect(p.addrs.tallyBlockSize).toBe(37);
    const bytes = new Array(37).fill(0);
    bytes[0x1d] = 1;
    bytes[0x20] = 2;
    expect(p.tallyOf(1, bytes)).toBe('pgm');
    expect(p.tallyOf(4, bytes)).toBe('pst');
    expect(p.tallyOf(8, bytes)).toBe('off');
  });
  test('件数と capabilities（LAN 先行、CUT/AUTO・マクロ・シーケンサーは不明で非表示）', () => {
    expect(p.inputCount).toBe(8);
    expect(p.columns).toBe(4);
    expect(p.pinpCount).toBe(4);
    expect(p.dskCount).toBe(2);
    expect(p.memoryCount).toBe(32);
    expect(p.audioInputs).toHaveLength(24);
    expect(p.capabilities).toEqual({ cutAuto: false, tallySubscribe: false, usb: false, ble: false, split: true, macro: false, sequencer: false });
  });
});

describe('VR-6HD プロファイル（Remote Control Guide eng03）', () => {
  const vr6 = getProfile('VR-6HD');
  test('Model ID 5 バイト、LAN 4 桁 PW・ack 06、USB/BLE あり', () => {
    expect(vr6.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x00, 0x2c]);
    expect(vr6.passwordLength).toBe(4);
    expect(vr6.lanAck).toBe('byte06');
    expect(vr6.capabilities).toEqual({ cutAuto: false, tallySubscribe: false, usb: true, ble: true, split: true, macro: false, sequencer: false });
    expect(profileFromVerName('VR-6HD')).toBe(vr6);
  });
  test('アドレス：PGM 000F00、INPUT n = 16H+n、タリー 29 バイト', () => {
    expect(addrToHex(vr6.addrs.pgm)).toBe('000F00');
    expect(addrToHex(vr6.addrs.fader!)).toBe('000F02');
    expect(addrToHex(vr6.addrs.transTime)).toBe('000B02');
    expect(addrToHex(vr6.addrs.pinp(2).source!)).toBe('000D03');
    expect(addrToHex(vr6.addrs.dsk(1).type!)).toBe('000E06');
    expect(addrToHex(vr6.addrs.split(1))).toBe('000B08');
    expect(addrToHex(vr6.addrs.audioLevel(0x11))).toBe('011103');
    expect(vr6.encodeInput(6)).toBe(0x1c);
    expect(vr6.decodeInput(0x17, () => undefined)).toBe(1);
    expect(vr6.decodeInput(0x03, (n) => (n === 4 ? 0x03 : undefined))).toBe(4);
    expect(vr6.addrs.tallyBlockSize).toBe(29);
    expect(vr6.tallyIndexOf(6)).toBe(0x1c);
    expect(vr6.inputCount).toBe(6);
    expect(vr6.memoryCount).toBe(32);
  });
});

describe('V-1-4K プロファイル（Remote Control Guide eng01）', () => {
  const v14k = getProfile('V-1-4K');
  test('Model ID 3 バイト、LAN 8 文字 PW・ACK 文字列、フェーダー 0–4095、CUT/AUTO は 0B 00 1A/1B', () => {
    expect(v14k.sysexModelId).toEqual([0x01, 0x06, 0x10]);
    expect(v14k.passwordLength).toBe(8);
    expect(v14k.lanAck).toBe('asciiACK');
    expect(v14k.faderMax).toBe(4095);
    expect(v14k.capabilities.cutAuto).toBe(true);
    expect(v14k.addrs.cut && addrToHex(v14k.addrs.cut)).toBe('0B001A');
    expect(v14k.addrs.auto && addrToHex(v14k.addrs.auto)).toBe('0B001B');
    expect(v14k.pinpCount).toBe(0);
    expect(v14k.dskCount).toBe(1);
    expect(addrToHex(v14k.addrs.dsk(1).source!)).toBe('001000');
    expect(addrToHex(v14k.addrs.audioLevel(0x03))).toBe('010302');
    expect(addrToHex(v14k.addrs.audioMute!(0x03))).toBe('010305');
  });
  test('ソース値：HDMI 00–04 / STILL 05–06 / INPUT 07–0E / BLACK 0F。割当値は相対', () => {
    expect(v14k.encodeInput(1)).toBe(0x07);
    expect(v14k.encodeInput(8)).toBe(0x0e);
    expect(v14k.decodeInput(0x0a, () => undefined)).toBe(4);
    // INPUT 3 に HDMI IN 3（割当値 00）、INPUT 6 に STILL 1（割当値 01）、INPUT 8 に BLACK（03）
    expect(v14k.assignToSource(3, 0x00)).toBe(0x02);
    expect(v14k.assignToSource(6, 0x00)).toBeNull();
    expect(v14k.assignToSource(6, 0x01)).toBe(0x05);
    expect(v14k.assignToSource(8, 0x03)).toBe(0x0f);
    expect(v14k.sourceToAssign(3, 0x02)).toBe(0x00);
    expect(v14k.sourceToAssign(3, 0x01)).toBeNull();
    expect(v14k.sourceToAssign(7, 0x06)).toBe(0x02);
    expect(v14k.sourceToAssign(1, 0x0f)).toBe(0x03);
    const assign = (n: number) => (n === 3 ? 0x02 : n === 8 ? 0x0f : undefined);
    expect(v14k.decodeInput(0x02, assign)).toBe(3);
    expect(v14k.decodeInput(0x0f, assign)).toBe(8);
    expect(v14k.addrs.tallyBlockSize).toBe(15);
    expect(v14k.tallyIndexOf(8)).toBe(0x0e);
  });
});

describe('Reference Manual 系（V-8HD / V-1HD / V-1SDI / VR-4HD / V-02HD MK II）', () => {
  test('V-8HD：Model ID 4 バイト、CUT/AUTO 0B 00 18/19、割当は相対、タリー 8 バイト、マクロ 50 05 04', () => {
    const p = getProfile('V-8HD');
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x68]);
    expect(p.capabilities).toMatchObject({ usb: true, ble: false, cutAuto: true, macro: true });
    expect(addrToHex(p.addrs.pgm)).toBe('001200');
    expect(addrToHex(p.addrs.fader!)).toBe('001203');
    expect(addrToHex(p.addrs.inputAssign!(3))).toBe('000200');
    expect(addrToHex(p.addrs.cut!)).toBe('0B0018');
    expect(addrToHex(p.addrs.pinp(2).source!)).toBe('000E02');
    expect(addrToHex(p.addrs.pinp(2).time!)).toBe('000B02');
    expect(addrToHex(p.addrs.dsk(1).time!)).toBe('000B03');
    expect(addrToHex(p.addrs.audioLevel(0x08))).toBe('010800');
    expect(addrToHex(p.addrs.macroTrigger!)).toBe('500504');
    expect(p.assignToSource(3, 0)).toBe(2);
    expect(p.assignToSource(3, 2)).toBe(9); // STILL 2
    expect(p.sourceToAssign(5, 4)).toBe(0);
    expect(p.sourceToAssign(5, 0)).toBeNull();
    expect(p.encodeInput(8)).toBe(7);
    expect(p.decodeInput(3, () => undefined)).toBe(4);
    expect(p.addrs.tallyBlockSize).toBe(8);
    expect(p.memoryCount).toBe(24);
    expect(p.version).toEqual({ addr: addr(0x02, 0x00, 0x00), size: 3, kind: 'digits' });
  });
  test('V-1HD：A/B バス 71 00 08/09、フェーダー 0–1023、音声 1 バイト、クロスポイント・タリー無し、版は 70 00 00 ASCII', () => {
    const p = getProfile('V-1HD');
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x20]);
    expect(addrToHex(p.addrs.pgm)).toBe('710008');
    expect(addrToHex(p.addrs.pst!)).toBe('710009');
    expect(p.faderMax).toBe(1023);
    expect(p.transTypes).toEqual(['WIPE', 'MIX', 'CUT']);
    expect(p.audioLevelCodec).toBe('u7');
    expect(p.addrs.inputAssign).toBeNull();
    expect(p.addrs.audioMute).toBeNull();
    expect(p.addrs.tallyBlock).toBeNull();
    expect(p.addrs.memCurrent).toBeNull();
    expect(p.version).toEqual({ addr: addr(0x70, 0x00, 0x00), size: 8, kind: 'ascii' });
    expect(p.pinpCount).toBe(0);
    expect(p.dskCount).toBe(0);
  });
  test('V-1SDI：AUTO は CTRL BUTTON 73 04 00 に 13H→53H、DSK ソース 71 00 20', () => {
    const p = getProfile('V-1SDI');
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x31]);
    expect(addrToHex(p.addrs.auto!)).toBe('730400');
    expect(p.addrs.autoValues).toEqual({ press: 0x13, release: 0x53 });
    expect(p.addrs.cut).toBeNull();
    expect(addrToHex(p.addrs.dsk(1).source!)).toBe('710020');
    expect(p.addrs.dsk(1).pvw).toBeNull();
    expect(addrToHex(p.addrs.memCurrent!)).toBe('730100');
  });
  test('VR-4HD：PST・T バー無し、TRANSITION TYPE は CUT/MIX/WIPE、音声 3 バイト・MUTE 01 xx 33', () => {
    const p = getProfile('VR-4HD');
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x29]);
    expect(p.addrs.pst).toBeNull();
    expect(p.addrs.fader).toBeNull();
    expect(p.transTypes).toEqual(['CUT', 'MIX', 'WIPE']);
    expect(addrToHex(p.addrs.transType!)).toBe('000702');
    expect(addrToHex(p.addrs.audioLevel(0x06))).toBe('010603');
    expect(addrToHex(p.addrs.audioMute!(0x06))).toBe('010633');
    expect(addrToHex(p.addrs.masterLevel)).toBe('010B00');
    expect(addrToHex(p.addrs.memLoad)).toBe('030300');
    expect(p.version.kind).toBe('ascii');
  });
  test('V-02HD MK II：Model ID 5 バイト、背景チャンネル 00 25 00、フェーダー 0–511、PinP/KEY は PGM のみ', () => {
    const p = getProfile('V-02HD-MK2');
    expect(p.sysexModelId).toEqual([0x00, 0x00, 0x00, 0x00, 0x0a]);
    expect(p.verName).toBe('V-02HD MK II');
    expect(addrToHex(p.addrs.pgm)).toBe('002500');
    expect(p.addrs.pst).toBeNull();
    expect(p.faderMax).toBe(511);
    expect(p.inputCount).toBe(2);
    expect(p.addrs.pinp(1).pvw).toBeNull();
    expect(addrToHex(p.addrs.pinp(1).pgm)).toBe('002213');
    expect(addrToHex(p.addrs.dsk(1).source!)).toBe('002300');
    expect(addrToHex(p.addrs.audioMute!(0x03))).toBe('010304');
  });
});
