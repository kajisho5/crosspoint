import { addr } from '@/core/codec/value';
import { EMBEDDED_DIGITAL_GAIN_DB, auxBuses, embeddedAudioPreset, groupAuxLabels, hdmiOut3Assign, sdiLevelAPreset } from '@/core/params/quick';

/** F14 クイック操作：カタログから組み立てる一括書込みの内容（アドレス・バイト列）を SPEC §9-1 / ガイドの表と突き合わせる */
describe('クイック操作（V-160HD）', () => {
  test('HDMI/SDI 入力音声：HDMI IN 1–8 ＋ SDI IN 1–8 の DIGITAL GAIN −16.8 dB と MONO LR MIX', () => {
    const p = embeddedAudioPreset('V-160HD')!;
    expect(p).not.toBeNull();
    expect(EMBEDDED_DIGITAL_GAIN_DB).toBe(-16.8);
    expect(p.writes).toHaveLength(16 * 2);
    // HDMI IN 1 = xx 05H、DIGITAL GAIN = 01 xx 01（2byte 符号付き ×0.1 → −168 = 7EH 58H）
    expect(p.writes[0]).toEqual({ addr: addr(0x01, 0x05, 0x01), bytes: [0x7e, 0x58], label: 'HDMI IN 1 DIGITAL GAIN → -16.8 dB' });
    // MONO = 01 xx 0A、LR MIX = 03H
    expect(p.writes[1]).toEqual({ addr: addr(0x01, 0x05, 0x0a), bytes: [0x03], label: 'HDMI IN 1 MONO → LR MIX' });
    // SDI IN 8 = xx 14H
    expect(p.writes[30]).toMatchObject({ addr: addr(0x01, 0x14, 0x01), bytes: [0x7e, 0x58] });
    expect(p.writes[31]).toMatchObject({ addr: addr(0x01, 0x14, 0x0a), bytes: [0x03] });
    // AUDIO IN / USB / Bluetooth は含めない
    expect(p.writes.some((w) => /AUDIO IN|USB|Bluetooth/.test(w.label))).toBe(false);
  });

  test('SDI OUT 1–3 の 3G-SDI MAPPING を LEVEL-A（00H）に', () => {
    const p = sdiLevelAPreset('V-160HD')!;
    expect(p.writes.map((w) => w.addr)).toEqual([addr(0x00, 0x14, 0x00), addr(0x00, 0x15, 0x00), addr(0x00, 0x16, 0x00)]);
    expect(p.writes.every((w) => w.bytes.length === 1 && w.bytes[0] === 0x00)).toBe(true);
  });

  test('HDMI OUT 3 ASSIGN：00 00 0C、PROGRAM=0 / PREVIEW=2 / MULTI-VIEW=8（FW 3.30 ガイド：AUX1-3・DSK SOURCE が間に入る）', () => {
    const a = hdmiOut3Assign('V-160HD')!;
    expect(a.addr).toBe(addr(0x00, 0x00, 0x0c));
    expect(a.choices).toEqual([
      { label: 'PROGRAM', index: 0 },
      { label: 'PREVIEW', index: 2 },
      { label: 'MULTI-VIEW', index: 8 },
    ]);
  });
});

describe('クイック操作（V-80HD）', () => {
  test('HDMI In 1–4 ＋ SDI In 1–4（xx 07H–0EH）', () => {
    const p = embeddedAudioPreset('V-80HD')!;
    expect(p.writes).toHaveLength(8 * 2);
    expect(p.writes[0]).toMatchObject({ addr: addr(0x01, 0x07, 0x01), bytes: [0x7e, 0x58] });
    expect(p.writes[15]).toMatchObject({ addr: addr(0x01, 0x0e, 0x0a), bytes: [0x03] });
  });

  test('SDI Out 1–2（xx 0DH–0EH）と HDMI Out 3 Assign（00 00 12、Multi-View=6）', () => {
    const p = sdiLevelAPreset('V-80HD')!;
    expect(p.writes.map((w) => w.addr)).toEqual([addr(0x00, 0x0d, 0x00), addr(0x00, 0x0e, 0x00)]);
    const a = hdmiOut3Assign('V-80HD')!;
    expect(a.addr).toBe(addr(0x00, 0x00, 0x12));
    expect(a.choices.map((c) => c.index)).toEqual([0, 2, 6]);
  });
});

describe('AUX バス（F15）', () => {
  test('V-160HD：AUX 1–3（00 00 11 / 2E / 2F、52 ソース）。出力割当では AUX 1 = 3、AUX 2 = 4、AUX 3 = 5（FW 3.30 ガイド）', () => {
    const b = auxBuses('V-160HD');
    expect(b.map((x) => [x.name, x.addr])).toEqual([
      ['AUX 1', addr(0x00, 0x00, 0x11)],
      ['AUX 2', addr(0x00, 0x00, 0x2e)],
      ['AUX 3', addr(0x00, 0x00, 0x2f)],
    ]);
    expect(b[0]!.param.labels).toHaveLength(52);
    expect(b[0]!.outputs.map((o) => o.name)).toEqual(['HDMI OUTPUT 1', 'HDMI OUTPUT 2', 'HDMI OUTPUT 3', 'SDI OUTPUT 1', 'SDI OUTPUT 2', 'SDI OUTPUT 3', 'USB OUTPUT']);
    expect(b[0]!.outputs.every((o) => o.auxIndex === 3)).toBe(true);
    expect(b[1]!.outputs.every((o) => o.auxIndex === 4)).toBe(true);
    expect(b[2]!.outputs.every((o) => o.auxIndex === 5)).toBe(true);
    const sec = groupAuxLabels(b[0]!.param.labels);
    expect(sec.map((s) => [s.title, s.items.length])).toEqual([
      ['HDMI', 8],
      ['SDI', 8],
      ['STILL', 16],
      ['INPUT', 20],
    ]);
  });

  test('V-80HD：Aux 1 / Aux 2（00 00 18 / 19）。出力割当では Aux 1 = 3、Aux 2 = 4', () => {
    const b = auxBuses('V-80HD');
    expect(b.map((x) => [x.name, x.addr])).toEqual([
      ['AUX 1', addr(0x00, 0x00, 0x18)],
      ['AUX 2', addr(0x00, 0x00, 0x19)],
    ]);
    expect(b[0]!.outputs.every((o) => o.auxIndex === 3)).toBe(true);
    expect(b[1]!.outputs.every((o) => o.auxIndex === 4)).toBe(true);
    expect(b[1]!.outputs.map((o) => o.name)).toContain('STREAM&RECORD');
    const sec = groupAuxLabels(b[0]!.param.labels);
    expect(sec.map((s) => s.title)).toEqual(['HDMI', 'SDI', 'STILL', 'INPUT', 'その他']);
    expect(sec.find((s) => s.title === 'その他')!.items.map((i) => i.label)).toEqual(['Video Player/SRT In']);
  });
});

describe('VR-120HD：クイック操作と AUX（カタログ由来）', () => {
  test('HDMI In 1–6 ＋ SDI In 1–6（xx 0CH–17H）の DIGITAL GAIN / MONO、SDI OUT 1–3 LEVEL-A、HDMI Out 3 Assign 00 00 0A', () => {
    const a = embeddedAudioPreset('VR-120HD')!;
    expect(a.writes).toHaveLength(12 * 2);
    expect(a.writes[0]).toMatchObject({ addr: addr(0x01, 0x0c, 0x01), bytes: [0x7e, 0x58] });
    expect(a.writes[23]).toMatchObject({ addr: addr(0x01, 0x17, 0x0a), bytes: [0x03] });
    const s = sdiLevelAPreset('VR-120HD')!;
    expect(s.writes.map((w) => w.addr)).toEqual([addr(0x00, 0x11, 0x00), addr(0x00, 0x12, 0x00), addr(0x00, 0x13, 0x00)]);
    const h = hdmiOut3Assign('VR-120HD')!;
    expect(h.addr).toBe(addr(0x00, 0x00, 0x0a));
    expect(h.choices).toEqual([
      { label: 'PROGRAM', index: 0 },
      { label: 'PREVIEW', index: 2 },
      { label: 'MULTI-VIEW', index: 7 },
    ]);
  });
  test('AUX 1/2/3（00 00 11 / 24 / 25）、出力割当の AUX n は index 3/4/5', () => {
    const b = auxBuses('VR-120HD');
    expect(b.map((x) => [x.name, x.addr])).toEqual([
      ['AUX 1', addr(0x00, 0x00, 0x11)],
      ['AUX 2', addr(0x00, 0x00, 0x24)],
      ['AUX 3', addr(0x00, 0x00, 0x25)],
    ]);
    expect(b[0]!.outputs.every((o) => o.auxIndex === 3)).toBe(true);
    expect(b[2]!.outputs.every((o) => o.auxIndex === 5)).toBe(true);
    expect(b[2]!.outputs.map((o) => o.name)).toEqual(['HDMI OUT 1', 'HDMI OUT 2', 'HDMI OUT 3', 'SDI OUT 1', 'SDI OUT 2', 'SDI OUT 3', 'USB OUT', 'STREAM/RECORD', 'LCD MONITOR']);
    expect(b[0]!.param.labels).toHaveLength(37); // HDMI 6, SDI 6, Still 16, VP/SRT, Input 1-8
  });
});
