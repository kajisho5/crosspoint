import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef } from './types';

/**
 * V-02HD MK II プロファイル。根拠：V-02HD MK II Reference Manual eng03（MIDI Implementation Version 1.00 / 2021-06-17、p.56–70）、
 * V-02HD MK II Remote（iPad）接続ガイド。転記：tools/guide/notes/v02hdmk2.md
 *  - 接続：USB STREAM（USB-C）のみ。「for remote control from PC and iPad」。USB MIDI クラスの明記は無い【推測】→ 実機確認（§13）
 *  - MIDI Model ID：Byte Explanation 表は 00H 00H 00H 00H 0AH（5 バイト）。概要行の `41H,10H,00H,00H,00H,54H` と矛盾【不明】→ 5 バイトを採用し実機で確認
 *  - 2 入力の A/B 方式。PGM 相当 = 00 25 00 Background Channel（00–01 = INPUT 1/2）。PST バス無し
 *  - フェーダー：00 25 01（2 バイト 0–511）。トランジション 00 25 04 Effects Type（MIX/WIPE/PinP/KEY）、MIX/WIPE TIME 00 20 00
 *  - CUT / AUTO：SysEx アドレス無し（CC 55 / 54 のみ）→ 非表示
 *  - PinP：00 22 13 PROGRAM OUT MODE（ON/OFF）、時間 00 20 01。ソース・PVW 無し
 *  - KEY（DSK 相当）：00 23 25 PROGRAM OUT MODE、00 23 00 SOURCE（INPUT 1/2/STILL IMAGE）、00 23 01 TYPE、時間 00 20 02
 *  - オーディオ：01 xx 01–03 LEVEL、01 xx 04 MUTE（xx = 00 AUDIO IN 1、01 AUDIO IN 2、02 USB IN、03–04 HDMI IN 1–2）。MASTER 01 11 00–02 / 04
 *  - メモリー：0A 00 00 LOAD（write only）、0A 00 03 現在番号、名前のアドレス無し、8 個
 *  - タリー・ラベル・マクロ：無し。バージョン 02 00 00（6 バイト数値）
 */

function buildSources(): SourceDef[] {
  return [
    { code: 0, name: 'INPUT 1', labelAddr: null },
    { code: 1, name: 'INPUT 2', labelAddr: null },
    { code: 2, name: 'STILL', labelAddr: null },
  ];
}

const AUDIO_INPUTS = [
  { x: 0x00, short: 'AUDIO 1' },
  { x: 0x01, short: 'AUDIO 2' },
  { x: 0x02, short: 'USB' },
  { x: 0x03, short: 'HDMI 1' },
  { x: 0x04, short: 'HDMI 2' },
] as const;

export const v02hdmk2: DeviceProfile = {
  model: 'V-02HD-MK2',
  verName: 'V-02HD MK II',
  protocol: 'sysex',
  sysexModelId: [0x00, 0x00, 0x00, 0x00, 0x0a],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: true, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 2,
  bankSize: 2,
  columns: 2,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 1,
  dskCount: 1,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['MIX', 'WIPE', 'PinP', 'KEY'],
  audioLevelCodec: 'db3',
  version: { addr: addr(0x02, 0x00, 0x00), size: 6, kind: 'digits' },
  faderMax: 511,

  addrs: {
    pgm: addr(0x00, 0x25, 0x00),
    pst: null,
    fader: addr(0x00, 0x25, 0x01),
    transType: addr(0x00, 0x25, 0x04),
    transTime: addr(0x00, 0x20, 0x00),
    inputAssign: null,
    pinp: () => ({ pgm: addr(0x00, 0x22, 0x13), pvw: null, source: null, time: addr(0x00, 0x20, 0x01) }),
    dsk: () => ({
      pgm: addr(0x00, 0x23, 0x25),
      pvw: null,
      source: addr(0x00, 0x23, 0x00),
      type: addr(0x00, 0x23, 0x01),
      time: addr(0x00, 0x20, 0x02),
    }),
    split: () => addr(0x00, 0x25, 0x04),
    audioLevel: (x) => addr(0x01, x, 0x01),
    audioMute: (x) => addr(0x01, x, 0x04),
    masterLevel: addr(0x01, 0x11, 0x00),
    masterMute: addr(0x01, 0x11, 0x04),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
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
  decodeInput: (value) => (value >= 0 && value <= 1 ? value + 1 : null),
  tallyOf: () => 'off',
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
