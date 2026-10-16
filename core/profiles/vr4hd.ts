import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef } from './types';

/**
 * VR-4HD プロファイル。根拠：VR-4HD Reference Manual Ver.2.100（MIDI Implementation Version 1.50 / 2017-03-16、p.26–41）。
 * 転記：tools/guide/notes/vr4hd.md
 *  - 接続：MIDI IN/OUT と RS-232（REMOTE → RS-232 = ON）。LAN / Bluetooth 無し、USB は映像・音声ストリームのみ。
 *    iPhone からは USB MIDI インターフェース経由の MIDI DIN が候補【推測】
 *  - MIDI Model ID：00H 00H 00H 29H（4 バイト）、Device ID 10H、DT1 12H / RQ1 11H
 *  - PGM：00 07 00 VIDEO CH SELECT（00–03 = CH 1–4）。PST バス無し（00 07 01 は合成用サブチャンネル）。書くと TRANSITION TYPE（00 07 02：CUT/MIX/WIPE）で遷移【推測】
 *  - T バー無し。トランジション時間 00 01 02
 *  - 合成：00 07 03 COMPOSITION TYPE（OFF/PinP/SPLIT/QUAD）、KEY SW 00 07 04、KEY SOURCE 00 04 01、KEY TYPE 00 04 00
 *  - オーディオ：#01 xx 03–05 LEVEL（3 バイト、-INF/-80.0–+10.0 dB）、01 xx 33 MUTE。xx = 00–03 CH1–4、04 CH5/6、05 CH7/8、06–09 HDMI 1–4、0A USB。
 *    MAIN：#01 0B 00–02 / 01 0B 34
 *  - メモリー：03 03 00 RECALL TRIGGER（00–07）、03 03 01 現在番号（7F = 未ロード）、名前無し、8 個
 *  - タリー・ラベル・マクロ：無し。バージョン 03 00 00（8 文字 ASCII）
 */

function buildSources(): SourceDef[] {
  return [
    { code: 0, name: 'CH 1', labelAddr: null },
    { code: 1, name: 'CH 2', labelAddr: null },
    { code: 2, name: 'CH 3', labelAddr: null },
    { code: 3, name: 'CH 4', labelAddr: null },
    { code: 5, name: 'STILL', labelAddr: null },
  ];
}

const AUDIO_INPUTS = [
  ...Array.from({ length: 4 }, (_, i) => ({ x: 0x00 + i, short: `CH ${i + 1}` })),
  { x: 0x04, short: 'CH 5/6' },
  { x: 0x05, short: 'CH 7/8' },
  ...Array.from({ length: 4 }, (_, i) => ({ x: 0x06 + i, short: `HDMI ${i + 1}` })),
  { x: 0x0a, short: 'USB' },
] as const;

export const vr4hd: DeviceProfile = {
  model: 'VR-4HD',
  verName: 'VR-4HD',
  protocol: 'sysex',
  sysexModelId: [0x00, 0x00, 0x00, 0x29],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: true, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 4,
  bankSize: 4,
  columns: 4,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 1,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['CUT', 'MIX', 'WIPE'],
  audioLevelCodec: 'db3',
  version: { addr: addr(0x03, 0x00, 0x00), size: 8, kind: 'ascii' },
  faderMax: 2047,

  addrs: {
    pgm: addr(0x00, 0x07, 0x00),
    pst: null,
    fader: null,
    transType: addr(0x00, 0x07, 0x02),
    transTime: addr(0x00, 0x01, 0x02),
    inputAssign: null,
    pinp: () => ({ pgm: addr(0x00, 0x07, 0x03), pvw: null, source: addr(0x00, 0x07, 0x01), time: null }),
    // KEY：ソース値 00 OFF, 01–04 CH1–4, 05 STILL
    dsk: () => ({
      pgm: addr(0x00, 0x07, 0x04),
      pvw: null,
      source: addr(0x00, 0x04, 0x01),
      type: addr(0x00, 0x04, 0x00),
      time: null,
    }),
    split: () => addr(0x00, 0x07, 0x03),
    audioLevel: (x) => addr(0x01, x, 0x03),
    audioMute: (x) => addr(0x01, x, 0x33),
    masterLevel: addr(0x01, 0x0b, 0x00),
    masterMute: addr(0x01, 0x0b, 0x34),
    memLoad: addr(0x03, 0x03, 0x00),
    memCurrent: addr(0x03, 0x03, 0x01),
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
