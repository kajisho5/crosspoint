import { addr } from '@/core/codec/value';
import { EMBEDDED_DIGITAL_GAIN_DB, embeddedAudioPreset, hdmiOut3Assign, sdiLevelAPreset } from '@/core/params/quick';

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

  test('HDMI OUT 3 ASSIGN：00 00 0C、PROGRAM=0 / PREVIEW=2 / MULTI-VIEW=4', () => {
    const a = hdmiOut3Assign('V-160HD')!;
    expect(a.addr).toBe(addr(0x00, 0x00, 0x0c));
    expect(a.choices).toEqual([
      { label: 'PROGRAM', index: 0 },
      { label: 'PREVIEW', index: 2 },
      { label: 'MULTI-VIEW', index: 4 },
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
