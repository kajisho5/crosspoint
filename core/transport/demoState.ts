import { dbToU7, encodeAscii8, encodeLevel, encodeTime, encodeU14, addrOffset, type Addr } from '../codec/value';
import type { DeviceProfile } from '../profiles/types';
import { VA } from '../profiles/virtual';
import { getCatalog, paramAddr } from '../params';

/**
 * デモモード（F11）とモックの初期状態。名称はすべて架空（CLAUDE.md）。
 * 値は SPEC のアドレス・エンコードに従ったバイト列で持つ。
 */

export const DEMO_DEVICE_NAMES = ['DEMO-SW-A', 'DEMO-SW-B', 'DEMO-SW-C'] as const;

export type ByteMap = Map<Addr, number>;

function put(m: ByteMap, a: Addr, bytes: readonly number[]): void {
  bytes.forEach((b, i) => m.set(addrOffset(a, i), b));
}

/** クロスポイント n に割り当てる物理ソースと、その表示ラベル */
function demoAssignments(p: DeviceProfile): { n: number; code: number; label: string }[] {
  if (p.model === 'V-160HD') {
    const base = [
      { code: 0, label: 'CAM 1' },
      { code: 1, label: 'CAM 2' },
      { code: 2, label: 'CAM 3' },
      { code: 3, label: 'CAM 4' },
      { code: 4, label: 'PC 1' },
      { code: 5, label: 'PC 2' },
      { code: 14, label: 'SDI 7' },
      { code: 15, label: 'SDI 8' },
      { code: 16, label: 'STILL 1' },
      { code: 17, label: 'STILL 2' },
      { code: 6, label: 'PC 3' },
      { code: 7, label: 'VTR' },
      { code: 8, label: 'SDI 1' },
      { code: 9, label: 'SDI 2' },
      { code: 10, label: 'SDI 3' },
      { code: 11, label: 'SDI 4' },
      { code: 12, label: 'SDI 5' },
      { code: 13, label: 'SDI 6' },
      { code: 18, label: 'STILL 3' },
      { code: 19, label: 'STILL 4' },
    ];
    return base.map((b, i) => ({ n: i + 1, ...b }));
  }
  if (p.model === 'VR-120HD') {
    // HDMI In 1-6 = 00–05、SDI In 1-6 = 06–0B、Still = 0C–、VP/SRT = 1C
    const base = [
      { code: 0, label: 'CAM 1' },
      { code: 1, label: 'CAM 2' },
      { code: 6, label: 'CAM 3' },
      { code: 7, label: 'CAM 4' },
      { code: 2, label: 'PC 1' },
      { code: 3, label: 'PC 2' },
      { code: 0x1c, label: 'VP/SRT' },
      { code: 12, label: 'STILL 1' },
    ];
    return base.map((b, i) => ({ n: i + 1, ...b }));
  }
  if (p.model === 'VR-6HD') {
    // VIDEO IN 1-6 = 00–05、STILL = 06–15、VP/SRT = 16
    const base = [
      { code: 0, label: 'CAM 1' },
      { code: 1, label: 'CAM 2' },
      { code: 2, label: 'CAM 3' },
      { code: 3, label: 'PC 1' },
      { code: 0x16, label: 'VP/SRT' },
      { code: 6, label: 'STILL 1' },
    ];
    return base.map((b, i) => ({ n: i + 1, ...b }));
  }
  if (p.model === 'V-8HD') {
    // INPUT n ASSIGN は相対（00 = HDMI n、01–08 = STILL 1–8）。code は HDMI 1–8 = 0–7、STILL = 8–15
    const base = [
      { code: 0, label: 'CAM 1' },
      { code: 1, label: 'CAM 2' },
      { code: 2, label: 'CAM 3' },
      { code: 3, label: 'CAM 4' },
      { code: 4, label: 'PC 1' },
      { code: 5, label: 'PC 2' },
      { code: 8, label: 'STILL 1' },
      { code: 9, label: 'STILL 2' },
    ];
    return base.map((b, i) => ({ n: i + 1, ...b }));
  }
  if (p.addrs.inputAssign == null) {
    // 物理入力直指定の機種：INPUT n = sources[n-1]
    return p.sources.slice(0, p.inputCount).map((s, i) => ({ n: i + 1, code: s.code, label: s.name }));
  }
  if (p.model === 'V-1-4K') {
    // INPUT 1–5 は自分の番号の HDMI IN、6–7 は STILL、8 は BLACK（割当値は相対。sourceToAssign で変換）
    const base = [
      { code: 0, label: 'CAM 1' },
      { code: 1, label: 'CAM 2' },
      { code: 2, label: 'CAM 3' },
      { code: 3, label: 'PC 1' },
      { code: 4, label: 'PC 2' },
      { code: 5, label: 'STILL 1' },
      { code: 6, label: 'STILL 2' },
      { code: 0x0f, label: 'BLACK' },
    ];
    return base.map((b, i) => ({ n: i + 1, ...b }));
  }
  const base = [
    { code: 4, label: 'CAM 1' },
    { code: 5, label: 'CAM 2' },
    { code: 6, label: 'CAM 3' },
    { code: 7, label: 'CAM 4' },
    { code: 0, label: 'PC 1' },
    { code: 1, label: 'PC 2' },
    { code: 2, label: 'PC 3' },
    { code: 0x28, label: 'VP/SRT' },
    { code: 8, label: 'STILL 1' },
    { code: 9, label: 'STILL 2' },
    { code: 10, label: 'STILL 3' },
    { code: 11, label: 'STILL 4' },
    { code: 12, label: 'STILL 5' },
    { code: 13, label: 'STILL 6' },
    { code: 3, label: 'HDMI 4' },
    { code: 14, label: 'STILL 7' },
  ];
  return base.map((b, i) => ({ n: i + 1, ...b }));
}

/** LAN テキストコマンド機種（仮想アドレス）の既定値。以降の汎用シードで上書きされる分もある */
function seedTextModelDefaults(m: ByteMap): void {
  put(m, VA.aux, [0]);
  put(m, VA.outputFade, [0]);
  put(m, VA.pinp(1), [0]);
  put(m, VA.pinp(2), [0]);
  put(m, VA.dskPgm, [0]);
  put(m, VA.dskPvw, [0]);
}

/** デモの DSK ソース（機種ごとのソース値域に収める） */
function demoDskSource(p: DeviceProfile, v160: number): number {
  switch (p.model) {
    case 'V-160HD':
      return v160;
    case 'VR-120HD':
      return 12;
    case 'VR-6HD':
      return 6;
    case 'V-1-4K':
      return 5;
    case 'V-8HD':
      return 8; // STILL 1
    case 'V-1SDI':
      return 4; // STILL
    case 'VR-4HD':
      return 5; // STILL
    case 'V-02HD-MK2':
      return 2; // STILL IMAGE
    default:
      return 9;
  }
}

export function buildDemoState(p: DeviceProfile): ByteMap {
  const m: ByteMap = new Map();
  if (p.protocol === 'text') seedTextModelDefaults(m);
  const assigns = demoAssignments(p);

  for (const a of assigns) {
    if (p.addrs.inputAssign != null) put(m, p.addrs.inputAssign(a.n), [p.sourceToAssign(a.n, a.code) ?? 0]);
    const src = p.sources.find((s) => s.code === a.code);
    if (src?.labelAddr != null) put(m, src.labelAddr, encodeAscii8(a.label, 0x00));
  }

  // PGM = INPUT 1、PST = INPUT 3（ボード S1）
  put(m, p.addrs.pgm, [p.encodeInput(1)]);
  if (p.addrs.pst != null) put(m, p.addrs.pst, [p.encodeInput(3)]);
  if (p.addrs.fader != null) put(m, p.addrs.fader, encodeU14(Math.round(p.faderMax * 0.38)));
  if (p.addrs.faderBase != null) put(m, p.addrs.faderBase, [0]);
  if (p.addrs.transType != null) put(m, p.addrs.transType, [0]);
  put(m, p.addrs.transTime, encodeTime(1.0));

  // キー（ボード S2）
  const pinpSeed = [
    { pgm: 1, pvw: 0, src: 1, t: 0.5 },
    { pgm: 0, pvw: 1, src: 4, t: 0.5 },
    { pgm: 0, pvw: 0, src: 16, t: 1.0 },
    { pgm: 0, pvw: 0, src: 3, t: 1.0 },
  ];
  for (let n = 1; n <= p.pinpCount; n += 1) {
    const s = pinpSeed[n - 1];
    if (!s) continue;
    const k = p.addrs.pinp(n);
    const srcCode = p.model === 'V-160HD' ? s.src : Math.min(s.src, p.model === 'VR-120HD' ? 11 : p.model === 'VR-6HD' ? 5 : 7);
    put(m, k.pgm, [s.pgm]);
    if (k.pvw != null) put(m, k.pvw, [s.pvw]);
    if (k.source != null) put(m, k.source, [srcCode]);
    if (k.time != null) put(m, k.time, encodeTime(s.t));
  }
  const dskSeed = [
    { pgm: 1, pvw: 1, src: 17, type: 0, t: 1.0 },
    { pgm: 0, pvw: 0, src: 5, type: 2, t: 1.0 },
  ];
  for (let n = 1; n <= p.dskCount; n += 1) {
    const s = dskSeed[n - 1];
    if (!s) continue;
    const k = p.addrs.dsk(n);
    put(m, k.pgm, [s.pgm]);
    if (k.pvw != null) put(m, k.pvw, [s.pvw]);
    if (k.source != null) put(m, k.source, [demoDskSource(p, s.src)]);
    if (k.type != null) put(m, k.type, [s.type]);
    if (k.time != null) put(m, k.time, encodeTime(s.t));
  }
  for (let n = 1; n <= p.splitCount; n += 1) put(m, p.addrs.split(n), [0]);

  // オーディオ（ボード S3）
  const levels: Record<string, { db: number | null; mute: boolean }> = {
    'IN 1': { db: -6.0, mute: false },
    'IN 2': { db: 0.0, mute: false },
    'IN 3/4': { db: -10.0, mute: false },
    USB: { db: null, mute: true },
    BT: { db: -12.5, mute: false },
  };
  for (const ch of p.audioInputs) {
    const v = levels[ch.short] ?? { db: -20.0, mute: false };
    put(m, p.addrs.audioLevel(ch.x), p.audioLevelCodec === 'db3' ? encodeLevel(v.db) : [dbToU7(v.db)]);
    if (p.addrs.audioMute != null) put(m, p.addrs.audioMute(ch.x), [v.mute ? 1 : 0]);
  }
  put(m, p.addrs.masterLevel, p.audioLevelCodec === 'db3' ? encodeLevel(-2.0) : [dbToU7(-2.0)]);
  if (p.addrs.masterMute != null) put(m, p.addrs.masterMute, [0]);

  // メモリー（ボード S4：現在 07、1–12 に名前）
  if (p.addrs.memCurrent != null) put(m, p.addrs.memCurrent, [6]);
  if (p.addrs.memName != null) {
    for (let n = 1; n <= p.memoryCount; n += 1) {
      put(m, p.addrs.memName(n), encodeAscii8(n <= 12 ? 'SCENE' : ''));
    }
  }

  writeTally(m, p);
  seedCatalogDefaults(m, p);
  return m;
}

/** Fill catalog parameters that do not have a hand-authored demo value. */
function seedCatalogDefaults(m: ByteMap, p: DeviceProfile): void {
  for (const group of getCatalog(p.model).groups) {
    for (const param of group.params) {
      if (param.writeOnly || param.exec) continue;
      const instances = param.a2 === 'xx' ? group.instances ?? [null] : [null];
      for (const instance of instances) {
        const base = paramAddr(param, instance);
        for (let offset = 0; offset < param.size; offset += 1) {
          const a = addrOffset(base, offset);
          if (!m.has(a)) m.set(a, 0);
        }
      }
    }
  }
}

/** PGM/PST の値からタリーブロックを作り直す（モック用） */
export function writeTally(m: ByteMap, p: DeviceProfile): void {
  if (p.addrs.tallyBlock == null) return;
  const size = p.addrs.tallyBlockSize;
  const bytes = new Array<number>(size).fill(0);
  const assignOf = (n: number) => {
    if (p.addrs.inputAssign == null) return p.assignToSource(n, 0) ?? undefined;
    const v = m.get(p.addrs.inputAssign(n));
    return v === undefined ? undefined : (p.assignToSource(n, v) ?? undefined);
  };
  const pgm = p.decodeInput(m.get(p.addrs.pgm) ?? 0, assignOf);
  const pst = p.addrs.pst == null ? null : p.decodeInput(m.get(p.addrs.pst) ?? 0, assignOf);
  for (let n = 1; n <= p.inputCount; n += 1) {
    const idx = p.tallyIndexOf(n);
    if (idx >= size) continue;
    const isPgm = n === pgm;
    const isPst = n === pst;
    const t = isPgm && isPst ? 'both' : isPgm ? 'pgm' : isPst ? 'pst' : 'off';
    bytes[idx] = p.encodeTally(t);
  }
  put(m, p.addrs.tallyBlock, bytes);
}
