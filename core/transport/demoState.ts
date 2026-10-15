import { encodeAscii8, encodeLevel, encodeTime, encodeU14, addrOffset, type Addr } from '../codec/value';
import type { DeviceProfile } from '../profiles/types';

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

export function buildDemoState(p: DeviceProfile): ByteMap {
  const m: ByteMap = new Map();
  const assigns = demoAssignments(p);

  for (const a of assigns) {
    put(m, p.addrs.inputAssign(a.n), [a.code]);
    const src = p.sources.find((s) => s.code === a.code);
    if (src?.labelAddr != null) put(m, src.labelAddr, encodeAscii8(a.label));
  }

  // PGM = INPUT 1、PST = INPUT 3（ボード S1）
  put(m, p.addrs.pgm, [p.encodeInput(1)]);
  put(m, p.addrs.pst, [p.encodeInput(3)]);
  put(m, p.addrs.fader, encodeU14(Math.round(2047 * 0.38)));
  put(m, p.addrs.transType, [0]);
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
    const srcCode = p.model === 'V-160HD' ? s.src : Math.min(s.src, p.model === 'VR-120HD' ? 11 : 7);
    put(m, k.pgm, [s.pgm]);
    put(m, k.pvw, [s.pvw]);
    put(m, k.source, [srcCode]);
    put(m, k.time, encodeTime(s.t));
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
    put(m, k.pvw, [s.pvw]);
    put(m, k.source, [p.model === 'V-160HD' ? s.src : p.model === 'VR-120HD' ? 12 : 9]);
    if (k.type != null) put(m, k.type, [s.type]);
    put(m, k.time, encodeTime(s.t));
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
    put(m, p.addrs.audioLevel(ch.x), encodeLevel(v.db));
    put(m, p.addrs.audioMute(ch.x), [v.mute ? 1 : 0]);
  }
  put(m, p.addrs.masterLevel, encodeLevel(-2.0));
  put(m, p.addrs.masterMute, [0]);

  // メモリー（ボード S4：現在 07、1–12 に名前）
  put(m, p.addrs.memCurrent, [6]);
  for (let n = 1; n <= p.memoryCount; n += 1) {
    put(m, p.addrs.memName(n), encodeAscii8(n <= 12 ? 'SCENE' : ''));
  }

  writeTally(m, p);
  return m;
}

/** PGM/PST の値からタリーブロックを作り直す（モック用） */
export function writeTally(m: ByteMap, p: DeviceProfile): void {
  const size = p.addrs.tallyBlockSize;
  const bytes = new Array<number>(size).fill(0);
  const assignOf = (n: number) => m.get(p.addrs.inputAssign(n));
  const pgm = p.decodeInput(m.get(p.addrs.pgm) ?? 0, assignOf);
  const pst = p.decodeInput(m.get(p.addrs.pst) ?? 0, assignOf);
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
