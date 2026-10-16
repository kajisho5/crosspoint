import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * V-80HD プロファイル（SPEC §9-4・§9-5。根拠：V-80HD Remote Control Guide v1.03）。
 * CUT/AUTO（0B 領域）・タリー購読・USB/BLE は未確認のため無効。
 */

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 4; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x20 + i, 0x00) });
  for (let i = 0; i < 4; i += 1) out.push({ code: 4 + i, name: `SDI ${i + 1}`, labelAddr: addr(0x02, 0x24 + i, 0x00) });
  for (let i = 0; i < 32; i += 1) out.push({ code: 8 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x28 + i, 0x00) });
  out.push({ code: 0x28, name: 'VP/SRT', labelAddr: addr(0x02, 0x48, 0x00) });
  return out;
}

const AUDIO_INPUTS = [
  { x: 0x01, short: 'IN 1' },
  { x: 0x02, short: 'IN 2' },
  { x: 0x03, short: 'IN 3/4' },
  { x: 0x04, short: 'USB' },
  { x: 0x05, short: 'BT' },
  { x: 0x06, short: 'PLAYER' },
  ...Array.from({ length: 4 }, (_, i) => ({ x: 0x07 + i, short: `HDMI ${i + 1}` })),
  ...Array.from({ length: 4 }, (_, i) => ({ x: 0x0b + i, short: `SDI ${i + 1}` })),
  { x: 0x0f, short: 'VP/SRT' },
] as const;

/** タリー：1byte ずつ 00=OFF / 01=PGM / 02=PST */
function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const v80hd: DeviceProfile = {
  model: 'V-80HD',
  verName: 'V-80HD',
  sysexModelId: [0x01, 0x05, 0x14],
  passwordLength: 8,
  lanAck: 'asciiACK',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: false, ble: false, split: true, macro: false, sequencer: false },

  inputCount: 16,
  bankSize: 8,
  columns: 4,

  memoryCount: 32,
  memoryNoun: 'シーン',

  pinpCount: 2,
  dskCount: 1,
  splitCount: 2,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,

  faderMax: 2047,

  addrs: {
    pgm: addr(0x00, 0x15, 0x00),
    pst: addr(0x00, 0x15, 0x01),
    fader: addr(0x00, 0x15, 0x02),
    transType: addr(0x00, 0x0f, 0x00),
    transTime: addr(0x00, 0x0f, 0x02),
    inputAssign: (n) => addr(0x00, 0x00, n - 1),
    pinp: (n) => {
      const mid = 0x12 + (n - 1);
      return {
        time: addr(0x00, mid, 0x00),
        pgm: addr(0x00, mid, 0x01),
        pvw: addr(0x00, mid, 0x02),
        source: addr(0x00, mid, 0x03),
      };
    },
    dsk: () => ({
      time: addr(0x00, 0x14, 0x00),
      pgm: addr(0x00, 0x14, 0x01),
      pvw: addr(0x00, 0x14, 0x02),
      source: addr(0x00, 0x14, 0x04),
      type: addr(0x00, 0x14, 0x06),
    }),
    split: (n) => addr(0x00, 0x10 + (n - 1), 0x00),
    audioLevel: (x) => addr(0x01, x, 0x03),
    audioMute: (x) => addr(0x01, x, 0x06),
    masterLevel: addr(0x01, 0x21, 0x00),
    masterMute: addr(0x01, 0x21, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 57,
    cut: null,
    auto: null,
    // V-80HD のマクロ実行アドレス・シーケンサーのパネルスイッチはガイド未記載・公開 OSS にも無い【不明】
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 100,

  assignToSource: (_n, value) => value,
  sourceToAssign: (_n, code) => code,
  encodeInput: (n) => 0x28 + n,
  decodeInput: (value, assignOf) => {
    if (value >= 0x29 && value <= 0x38) return value - 0x28;
    if (value <= 0x28) {
      for (let n = 1; n <= 16; n += 1) {
        if (assignOf(n) === value) return n;
      }
    }
    return null;
  },
  /** 並び：00–07 HDMI/SDI, 08–27 STILL, 28 VP/SRT, 29–38 INPUT 1–16 */
  tallyOf: (n, bytes) => byteToTally(bytes[0x28 + n] ?? 0),
  tallyIndexOf: (n) => 0x28 + n,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
