import { addr } from '@/core/codec/value';
import {
  bytesToSigned,
  decodeParam,
  encodeEnum,
  encodeInt,
  encodeText,
  findGroup,
  getCatalog,
  groupRanges,
  paramAddr,
  signedToBytes,
  type EnumParam,
  type IntParam,
} from '@/core/params';

/** F13：Remote Control Guide 由来のパラメータカタログ（tools/guide/normalize.py の出力）の整合 */
describe('params カタログ', () => {
  test('両機種のカタログが読める', () => {
    const v160 = getCatalog('V-160HD');
    const v80 = getCatalog('V-80HD');
    expect(v160.groups.length).toBeGreaterThan(25);
    expect(v80.groups.length).toBeGreaterThan(40);
    expect(v160.groups.reduce((n, g) => n + g.params.length, 0)).toBeGreaterThan(500);
    // xx 付きグループは instances を持つ（V-80HD の Memory 名だけは例外として warning）
    for (const g of [...v160.groups, ...v80.groups]) {
      if (g.params.some((p) => p.a2 === 'xx')) expect(g.instances != null || g.warning != null).toBe(true);
    }
  });

  test('V-160HD：既知のアドレスがカタログと一致する（SPEC §9-1 の表）', () => {
    const v160 = getCatalog('V-160HD');
    const find = (title: string, name: string) => {
      const g = v160.groups.find((x) => x.title === title);
      const p = g?.params.find((x) => x.name === name);
      if (!g || !p) throw new Error(`${title} / ${name} が無い`);
      return { g, p };
    };
    expect(paramAddr(find('Panel', 'PGM Select').p, null)).toBe(addr(0x00, 0x21, 0x00));
    expect(paramAddr(find('Panel', 'AB Fader Level').p, null)).toBe(addr(0x00, 0x21, 0x02));
    expect(find('Panel', 'AB Fader Level').p.size).toBe(2);
    expect(paramAddr(find('MIX/WIPE', 'TRANSITION TYPE').p, null)).toBe(addr(0x00, 0x18, 0x00));
    expect(paramAddr(find('TRANSITION TIME', 'MIX/WIPE TIME').p, null)).toBe(addr(0x00, 0x17, 0x00));
    const pinp = find('PinP & KEY', 'POSITION H');
    expect(paramAddr(pinp.p, pinp.g.instances![2]!)).toBe(addr(0x00, 0x1d, 0x04)); // PinP & KEY 3
    const audio = find('AUDIO INPUT', 'INPUT LEVEL');
    expect(audio.g.instances!.length).toBe(21);
    expect(audio.g.instances![2]!.label).toBe('AUDIO IN 3/4');
    expect(paramAddr(audio.p, audio.g.instances![3]!)).toBe(addr(0x01, 0x03, 0x03)); // USB IN
    expect(audio.p.kind).toBe('level');
    const label = find('LABEL EDIT', 'LABEL');
    expect(label.p.kind).toBe('text');
    expect(label.p.size).toBe(8);
    expect(label.g.instances!.length).toBe(40); // FW 3.30：AUX 1–3・DSK 1-2 SOURCE・3D が増えた
    expect(label.g.instances![8]!.label).toBe('SDI 1');
    expect(paramAddr(label.p, label.g.instances![8]!)).toBe(addr(0x02, 0x18, 0x00));
    const cam = find('CAMERA CONTROL', 'PAN');
    expect(cam.g.instances!.length).toBe(16);
    expect((cam.p as EnumParam).values).toEqual([-1, 0, 1]);
    expect((cam.p as EnumParam).labels).toEqual(['LEFT', 'STOP', 'RIGHT']);
    const mem = find('Memory', 'Memory Load Trigger');
    expect(mem.p.writeOnly).toBe(true);
    expect(paramAddr(mem.p, null)).toBe(addr(0x0a, 0x00, 0x00));
  });

  test('V-80HD：PGM/PST は 00 15 xx、PinP&Key は 2 系統', () => {
    const v80 = getCatalog('V-80HD');
    const panel = v80.groups.find((g) => g.title === 'Panel')!;
    expect(paramAddr(panel.params.find((p) => p.name === 'PGM Select')!, null)).toBe(addr(0x00, 0x15, 0x00));
    const pinp = v80.groups.find((g) => g.title === 'PinP&Key')!;
    expect(pinp.instances!.length).toBe(2);
  });

  test('符号付き 7bit 連結のエンコード／デコード', () => {
    expect(signedToBytes(-500, 2)).toEqual([0x7c, 0x0c]); // ガイド：7CH 0CH = -50.0%
    expect(bytesToSigned([0x7c, 0x0c])).toBe(-500);
    expect(signedToBytes(500, 2)).toEqual([0x03, 0x74]);
    expect(signedToBytes(-1, 1)).toEqual([0x7f]);
    expect(signedToBytes(-64, 1)).toEqual([0x40]);
    expect(bytesToSigned([0x40])).toBe(-64);
    expect(signedToBytes(-420, 2)).toEqual([0x7c, 0x5c]); // DIGITAL GAIN −42.0dB（ガイド記載例）
  });

  test('int パラメータの表示値 ⇄ バイト列', () => {
    const v160 = getCatalog('V-160HD');
    const pinp = v160.groups.find((g) => g.title === 'PinP & KEY')!;
    const pos = pinp.params.find((p) => p.name === 'POSITION H') as IntParam;
    expect(encodeInt(pos, -50)).toEqual([0x7c, 0x0c]);
    expect(decodeParam(pos, [0x7c, 0x0c])).toEqual({ kind: 'int', value: -50, text: '-50.0%', isZeroLabel: false });
    const size = pinp.params.find((p) => p.name === 'SIZE') as IntParam;
    expect(encodeInt(size, 100)).toEqual([0x07, 0x68]);
    expect(encodeInt(size, 5)).toEqual([0x00, 0x32]); // 5.0%（FW 3.30 ガイドでは下限 0.0%）
    expect(encodeInt(size, -1)).toEqual([0x00, 0x00]); // 下限にクランプ
    const scan = v160.groups.find((g) => g.title === 'AUTO SWITCHING')!.params.find((p) => p.name === 'INPUT SCAN TIME / INPUT 1') as IntParam;
    expect(decodeParam(scan, [0])).toMatchObject({ kind: 'int', text: 'OFF', isZeroLabel: true });
    expect(decodeParam(scan, [120])).toMatchObject({ kind: 'int', text: '120 sec' });
    const time = v160.groups.find((g) => g.title === 'TRANSITION TIME')!.params.find((p) => p.name === 'MIX/WIPE TIME') as IntParam;
    expect(encodeInt(time, 1.5)).toEqual([15]);
    expect(decodeParam(time, [40])).toMatchObject({ text: '4.0 sec' });
  });

  test('enum／bool／level／text', () => {
    const v160 = getCatalog('V-160HD');
    const cam = v160.groups.find((g) => g.title === 'CAMERA CONTROL')!;
    const pan = cam.params.find((p) => p.name === 'PAN') as EnumParam;
    expect(encodeEnum(pan, 0)).toEqual([0x7f]); // LEFT
    expect(encodeEnum(pan, 1)).toEqual([0x00]); // STOP
    expect(decodeParam(pan, [0x01])).toMatchObject({ kind: 'enum', label: 'RIGHT' });
    const zoom = cam.params.find((p) => p.name === 'ZOOM') as EnumParam;
    expect(encodeEnum(zoom, 0)).toEqual([0x7e]); // WIDE (FAST)
    const freeze = v160.groups.find((g) => g.title === 'FREEZE')!.params.find((p) => p.name === 'FREEZE SW')!;
    expect(decodeParam(freeze, [1])).toEqual({ kind: 'bool', on: true });
    const level = v160.groups.find((g) => g.title === 'AUDIO INPUT')!.params.find((p) => p.name === 'INPUT LEVEL')!;
    expect(decodeParam(level, [0x7e, 0x00, 0x00])).toMatchObject({ kind: 'level', db: null, text: '−INF' });
    expect(decodeParam(level, [0x7f, 0x79, 0x60])).toMatchObject({ kind: 'level', db: -80 });
    expect(encodeText('CAM 1', 8)).toEqual([0x43, 0x41, 0x4d, 0x20, 0x31, 0x20, 0x20, 0x20]);
    expect(decodeParam(v160.groups.find((g) => g.title === 'LABEL EDIT')!.params[0]!, encodeText('STAGE L', 8))).toEqual({ kind: 'text', text: 'STAGE L' });
  });

  test('groupRanges は書込み専用・トリガを除く', () => {
    const mem = findGroup('V-160HD', getCatalog('V-160HD').groups.find((g) => g.title === 'Memory')!.id)!;
    const r = groupRanges(mem, null);
    expect(r.some((x) => x.addr === addr(0x0a, 0x00, 0x00))).toBe(false); // Load Trigger
    expect(r.some((x) => x.addr === addr(0x0a, 0x00, 0x03))).toBe(true); // Loaded Memory Number
  });
});
