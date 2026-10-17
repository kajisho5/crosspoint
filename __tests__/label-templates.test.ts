import { applyTemplate, LABEL_TEMPLATES } from '@/lib/labelTemplates';

describe('ラベルテンプレート', () => {
  const cam = LABEL_TEMPLATES.find((t) => t.text === 'CAM')!;
  const main = LABEL_TEMPLATES.find((t) => t.text === 'MAIN')!;

  test('番号付きは空いている最小番号', () => {
    expect(applyTemplate(cam, [])).toBe('CAM 1');
    expect(applyTemplate(cam, ['CAM 1', 'CAM 2'])).toBe('CAM 3');
    expect(applyTemplate(cam, ['CAM 1', 'CAM 3'])).toBe('CAM 2');
    expect(applyTemplate(cam, ['cam1', 'CAM  2 '])).toBe('CAM 3');
    expect(applyTemplate(cam, ['CAMERA 1', 'PC 1'])).toBe('CAM 1');
  });

  test('固定はそのまま', () => {
    expect(applyTemplate(main, ['MAIN'])).toBe('MAIN');
  });

  test('全テンプレートが 8 文字以内（番号 1 桁を含む）', () => {
    for (const t of LABEL_TEMPLATES) expect(applyTemplate(t, []).length).toBeLessThanOrEqual(8);
  });
});

describe('ラベルの空白', () => {
  test('書き込み：入力した空白は 20H、残りは 00H', () => {
    const { encodeAscii8 } = require('@/core/codec/value') as typeof import('@/core/codec/value');
    expect(encodeAscii8('   TITLE', 0x00)).toEqual([0x20, 0x20, 0x20, 0x54, 0x49, 0x54, 0x4c, 0x45]);
    expect(encodeAscii8('TITLE   ', 0x00)).toEqual([0x54, 0x49, 0x54, 0x4c, 0x45, 0x20, 0x20, 0x20]);
    expect(encodeAscii8(' TITLE', 0x00)).toEqual([0x20, 0x54, 0x49, 0x54, 0x4c, 0x45, 0, 0]);
  });
});
