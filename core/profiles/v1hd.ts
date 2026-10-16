import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef } from './types';

/**
 * V-1HD プロファイル。根拠：V-1HD Remote Control Guide Version 2.0（MIDI Implementation Version 1.00 / 2015-11-20）、
 * V-1HD Remote（iPad）接続ガイド。転記：tools/guide/notes/v1hd.md
 *  - 接続：USB MIDI と MIDI DIN。LAN / Bluetooth / RS-232 無し。受信には SETUP の MIDI Rx SOURCE = USB が必要（iPad アプリと同条件）
 *  - MIDI Model ID：00H 00H 00H 20H（4 バイト）、Device ID 00H–1FH（既定 10H）、DT1 12H / RQ1 11H
 *  - バス：A/B（PGM/PST モードは 70 01 15）。video sel A = 71 00 08、B = 71 00 09（00–03 = HDMI 1–4、物理入力直指定でクロスポイント無し）
 *  - フェーダー：#71 00 00（2 バイト 7bit×2、0–1023）
 *  - トランジション：71 00 0C（WIPE / MIX / CUT）、TRANSFORM TIME 71 00 14（0.0–4.0 s、29H–2CH は BPM 同期【推測】）
 *  - CUT / AUTO：専用トリガ無し（[CUT] は種別選択ボタン、TRANSFORMER [A]/[B] 73 04 00 = 12H/52H・13H/53H）【不明】→ 非表示
 *  - PinP / キー / SPLIT：EFFECTS A/B（71 00 0E/0F 種別、71 00 0A/0B ON）。ソース・PVW の区別無し → pinpCount/dskCount 0（全パラメータメニューで操作）
 *  - オーディオ：71 01 00–05 入力レベル（1 バイト 0–127）、71 01 06 MASTER。ミュート無し
 *  - メモリー：73 01 00（00–07 = MEMORY 1–8 ロード）。現在番号・名前の読出し無し
 *  - タリー・ラベル・マクロ：無し
 *  - バージョン：70 00 00（8 文字 ASCII、read only）
 */

function buildSources(): SourceDef[] {
  return Array.from({ length: 4 }, (_, i) => ({ code: i, name: `HDMI ${i + 1}`, labelAddr: null }));
}

const AUDIO_INPUTS = [
  ...Array.from({ length: 4 }, (_, i) => ({ x: 0x00 + i, short: `HDMI ${i + 1}` })),
  { x: 0x04, short: 'AUDIO IN' },
  { x: 0x05, short: 'MIC' },
] as const;

export const v1hd: DeviceProfile = {
  model: 'V-1HD',
  verName: 'V-1HD',
  protocol: 'sysex',
  sysexModelId: [0x00, 0x00, 0x00, 0x20],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: true, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 4,
  bankSize: 4,
  columns: 4,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 0,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['WIPE', 'MIX', 'CUT'],
  audioLevelCodec: 'u7',
  version: { addr: addr(0x70, 0x00, 0x00), size: 8, kind: 'ascii' },
  faderMax: 1023,

  addrs: {
    pgm: addr(0x71, 0x00, 0x08),
    pst: addr(0x71, 0x00, 0x09),
    fader: addr(0x71, 0x00, 0x00),
    transType: addr(0x71, 0x00, 0x0c),
    transTime: addr(0x71, 0x00, 0x14),
    inputAssign: null,
    pinp: () => ({ pgm: addr(0x71, 0x00, 0x0a), pvw: null, source: null, time: null }),
    dsk: () => ({ pgm: addr(0x71, 0x00, 0x0b), pvw: null, source: null, time: null }),
    split: () => addr(0x71, 0x00, 0x0a),
    // 71 01 xx：xx = 00–03 HDMI IN 1–4、04 AUDIO IN、05 MIC、06 MASTER（1 バイト 0–127）
    audioLevel: (x) => addr(0x71, 0x01, x),
    audioMute: null,
    masterLevel: addr(0x71, 0x01, 0x06),
    masterMute: null,
    memLoad: addr(0x73, 0x01, 0x00),
    memCurrent: null,
    memName: null,
    tallyBlock: null,
    tallyBlockSize: 0,
    cut: null,
    auto: null,
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 0,

  assignToSource: (n) => n - 1,
  sourceToAssign: (n, code) => (code === n - 1 ? 0 : null),
  encodeInput: (n) => n - 1,
  decodeInput: (value) => (value >= 0 && value <= 3 ? value + 1 : null),
  tallyOf: () => 'off',
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
