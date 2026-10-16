import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * VR-6HD プロファイル。根拠：VR-6HD Remote Control Guide eng03（MIDI Implementation Version 2.00 / 2024-09-27）、
 * VR-6HD Remote Connection Guide eng02、Reference Manual eng05、LAN/RS-232 Basic Control Commands eng02。
 *  - MIDI Model ID：00H 00H 00H 00H 2CH（5 バイト）、Device ID 10H
 *  - LAN：DIRECT STREAM 端子、TCP 8023、NETWORK PASSWORD 4 文字、DTH/RQH/VER は V-160HD と同語彙、ack は制御コード 06H（ガイド p.34）【事実】
 *  - USB：USB STREAM（USB-C）「for remote control from PC and iPad」。USB MIDI クラスの明記は無い【推測】→ 実機確認（§13）
 *  - Bluetooth：仕様に「GATT (MIDI over Bluetooth Low Energy)」「Bluetooth connection: for remote control from iPad」【事実】→ ble: true
 *  - PGM/PST：00 0F 00 / 01、値 = VIDEO IN 1–6 (00–05), STILL 1–16 (06–15), VIDEO PLAYER/SRT IN (16), INPUT 1–6 (17–1C)
 *  - フェーダー：00 0F 02（2 バイト 0–2047）
 *  - INPUT ASSIGN：00 00 00–05（INPUT 1–6）。値 = VIDEO IN 1–6, STILL 1–16, VP/SRT (16), N/A (17)
 *  - トランジション：00 0B 00（MIX/WIPE/SPLIT）、MIX TIME 00 0B 02
 *  - PinP&KEY 1–2：00 0C/0D xx（00 TIME, 01 PGM SW, 02 PVW SW, 03 SOURCE, 04 TYPE）
 *  - DSK：00 0E xx（00 TIME, 01 PGM SW, 02 PVW SW, 04 KEY SOURCE, 05 FILL SOURCE, 06 TYPE）
 *  - SPLIT：00 0B 08 SW（1 系統）
 *  - オーディオ入力：01 xx 03–05 LEVEL、01 xx 06 MUTE（xx = 01–11）。MAIN：01 21 00–02 / 03
 *  - メモリー：0A 00 00 LOAD（write only）、0A 00 03 現在番号、名前 60 xx 00、32 個
 *  - タリー：0C 00 00、29 バイト（00–1C、OFF/PGM/PST）。INPUT n = 16H+n。タリー購読（0C 01 00）はガイド未記載【不明】→ ポーリング
 *  - ラベル：02 xx 00–07、xx = 20H–（VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER, …）
 *  - CUT/AUTO の SysEx トリガは無し【事実：ガイドに無い】→ LAN 簡易制御コマンド `CUT;` / `ATO;`（lib/features.ts）。マクロ・シーケンサーも LAN のみ
 */

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 6; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x20 + i, 0x00) });
  for (let i = 0; i < 16; i += 1) out.push({ code: 6 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x26 + i, 0x00) });
  out.push({ code: 0x16, name: 'VP/SRT', labelAddr: addr(0x02, 0x36, 0x00) });
  return out;
}

/** Audio Input xx = 01H–11H（ガイド p.7 注記の順） */
const AUDIO_INPUTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 0x01 + i, short: `IN ${i + 1}` })),
  { x: 0x07, short: 'IN 7/8' },
  { x: 0x08, short: 'USB' },
  { x: 0x09, short: 'BT' },
  { x: 0x0a, short: 'PLAYER' },
  ...Array.from({ length: 6 }, (_, i) => ({ x: 0x0b + i, short: `HDMI ${i + 1}` })),
  { x: 0x11, short: 'VP/SRT' },
] as const;

function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const vr6hd: DeviceProfile = {
  model: 'VR-6HD',
  verName: 'VR-6HD',
  protocol: 'sysex',
  sysexModelId: [0x00, 0x00, 0x00, 0x00, 0x2c],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: true, ble: true, split: true, macro: false, sequencer: false },

  inputCount: 6,
  bankSize: 6,
  columns: 3,

  memoryCount: 32,
  memoryNoun: 'メモリー',

  pinpCount: 2,
  dskCount: 1,
  splitCount: 1,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['MIX', 'WIPE', 'SPLIT'],
  audioLevelCodec: 'db3',
  version: { addr: addr(0x02, 0x00, 0x00), size: 6, kind: 'digits' },
  faderMax: 2047,

  addrs: {
    pgm: addr(0x00, 0x0f, 0x00),
    pst: addr(0x00, 0x0f, 0x01),
    fader: addr(0x00, 0x0f, 0x02),
    transType: addr(0x00, 0x0b, 0x00),
    transTime: addr(0x00, 0x0b, 0x02),
    inputAssign: (n) => addr(0x00, 0x00, n - 1),
    pinp: (n) => {
      const mid = 0x0c + (n - 1);
      return {
        time: addr(0x00, mid, 0x00),
        pgm: addr(0x00, mid, 0x01),
        pvw: addr(0x00, mid, 0x02),
        source: addr(0x00, mid, 0x03),
      };
    },
    dsk: () => ({
      time: addr(0x00, 0x0e, 0x00),
      pgm: addr(0x00, 0x0e, 0x01),
      pvw: addr(0x00, 0x0e, 0x02),
      source: addr(0x00, 0x0e, 0x05),
      type: addr(0x00, 0x0e, 0x06),
    }),
    split: () => addr(0x00, 0x0b, 0x08),
    audioLevel: (x) => addr(0x01, x, 0x03),
    audioMute: (x) => addr(0x01, x, 0x06),
    masterLevel: addr(0x01, 0x21, 0x00),
    masterMute: addr(0x01, 0x21, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 29,
    cut: null,
    auto: null,
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 100,

  assignToSource: (_n, value) => value,
  sourceToAssign: (_n, code) => code,
  encodeInput: (n) => 0x16 + n,
  decodeInput: (value, assignOf) => {
    if (value >= 0x17 && value <= 0x1c) return value - 0x16;
    if (value <= 0x16) {
      for (let n = 1; n <= 6; n += 1) {
        if (assignOf(n) === value) return n;
      }
    }
    return null;
  },
  /** 並び：00–05 VIDEO IN, 06–15 STILL, 16 VP/SRT, 17–1C INPUT 1–6 */
  tallyOf: (n, bytes) => byteToTally(bytes[0x16 + n] ?? 0),
  tallyIndexOf: (n) => 0x16 + n,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
