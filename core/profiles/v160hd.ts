import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * V-160HD プロファイル（SPEC §9-1〜§9-3、§9-5）。
 * PGM/PST 値は既定 logical20（INPUT n → 0x1F+n）。物理入力値（00–1F）も解釈する。
 */

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 8; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x10 + i, 0x00) });
  for (let i = 0; i < 8; i += 1) out.push({ code: 8 + i, name: `SDI ${i + 1}`, labelAddr: addr(0x02, 0x18 + i, 0x00) });
  for (let i = 0; i < 16; i += 1) out.push({ code: 16 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x20 + i, 0x00) });
  return out;
}

const AUDIO_INPUTS = [
  { x: 0x00, short: 'IN 1' },
  { x: 0x01, short: 'IN 2' },
  { x: 0x02, short: 'IN 3/4' },
  { x: 0x03, short: 'USB' },
  { x: 0x04, short: 'BT' },
  ...Array.from({ length: 8 }, (_, i) => ({ x: 0x05 + i, short: `HDMI ${i + 1}` })),
  ...Array.from({ length: 8 }, (_, i) => ({ x: 0x0d + i, short: `SDI ${i + 1}` })),
] as const;

/** タリー：0x00=OFF, 0x01=PGM, 0x02=PVW, 0x03=PGM+PVW（購読形式のビットマスク） */
function bitmaskToTally(v: number): TallyState {
  const pgm = (v & 0x01) !== 0;
  const pst = (v & 0x02) !== 0;
  if (pgm && pst) return 'both';
  if (pgm) return 'pgm';
  if (pst) return 'pst';
  return 'off';
}

export const v160hd: DeviceProfile = {
  model: 'V-160HD',
  verName: 'V-160HD',
  sysexModelId: [0x00, 0x00, 0x00, 0x00, 0x02],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: true, tallySubscribe: true, usb: true, ble: true, split: true, macro: true, sequencer: true },

  inputCount: 20,
  bankSize: 10,
  columns: 5,

  memoryCount: 30,
  memoryNoun: 'メモリー',

  pinpCount: 4,
  dskCount: 2,
  splitCount: 2,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,

  addrs: {
    pgm: addr(0x00, 0x21, 0x00),
    pst: addr(0x00, 0x21, 0x01),
    fader: addr(0x00, 0x21, 0x02),
    transType: addr(0x00, 0x18, 0x00),
    transTime: addr(0x00, 0x17, 0x00),
    inputAssign: (n) => (n <= 10 ? addr(0x00, 0x00, n - 1) : addr(0x00, 0x00, 0x24 + (n - 11))),
    pinp: (n) => {
      const mid = 0x1b + (n - 1);
      return {
        pgm: addr(0x00, mid, 0x00),
        pvw: addr(0x00, mid, 0x01),
        source: addr(0x00, mid, 0x02),
        time: addr(0x00, 0x17, 0x01 + (n - 1)),
      };
    },
    dsk: (n) => {
      const mid = 0x1f + (n - 1);
      return {
        pgm: addr(0x00, mid, 0x00),
        pvw: addr(0x00, mid, 0x01),
        source: addr(0x00, mid, 0x03),
        type: addr(0x00, mid, 0x05),
        time: addr(0x00, 0x17, 0x05 + (n - 1)),
      };
    },
    split: (n) => addr(0x00, 0x19 + (n - 1), 0x00),
    audioLevel: (x) => addr(0x01, x, 0x03),
    audioMute: (x) => addr(0x01, x, 0x06),
    masterLevel: addr(0x01, 0x21, 0x00),
    masterMute: addr(0x01, 0x21, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 42,
    cut: addr(0x0b, 0x00, 0x1e),
    auto: addr(0x0b, 0x00, 0x1f),
    // Companion roland-v160hd の run_macro（'500504' に macro-1 を書く）【事実：公開 OSS、MIT】。ガイド未記載なので実機で確認（§13）
    macroTrigger: addr(0x50, 0x05, 0x04),
    // SPEC §9-2：0B004F–52 SEQUENCER ON/AUTO/PREV/NEXT SW【事実：Companion 定数】
    sequencer: { on: addr(0x0b, 0x00, 0x4f), auto: addr(0x0b, 0x00, 0x50), prev: addr(0x0b, 0x00, 0x51), next: addr(0x0b, 0x00, 0x52) },
  },
  macroCount: 100,

  encodeInput: (n) => 0x1f + n,
  decodeInput: (value, assignOf) => {
    if (value >= 0x20 && value <= 0x33) return value - 0x1f;
    if (value <= 0x1f) {
      for (let n = 1; n <= 20; n += 1) {
        if (assignOf(n) === value) return n;
      }
    }
    return null;
  },
  /** 並び：0–7 HDMI, 8–15 SDI, 16–31 STILL, 32–41 XPT 1–10 */
  tallyOf: (n, bytes) => {
    if (n > 10) return 'off';
    return bitmaskToTally(bytes[32 + (n - 1)] ?? 0);
  },
  tallyIndexOf: (n) => 32 + (n - 1),
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 3 })[t],
};
