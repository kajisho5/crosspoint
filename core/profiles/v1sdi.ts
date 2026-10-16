import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef } from './types';

/**
 * V-1SDI プロファイル。根拠：V-1SDI Reference Manual Ver.1.5（MIDI Implementation Version 1.50 / 2017-02-28、p.11–23）。
 * 転記：tools/guide/notes/v1sdi.md
 *  - 接続：MIDI IN/OUT（資料に端子形状の記載無し）と RS-232。USB の記載無し【不明】。iPhone からは USB MIDI インターフェース経由の MIDI DIN が候補【推測】
 *  - MIDI Model ID：00H 00H 00H 31H（4 バイト）、Device ID 10H、DT1 12H / RQ1 11H
 *  - バス：VIDEO SEL A = 71 03 08、B = 71 03 09（00–03 = INPUT 1–4、物理入力直指定）
 *  - フェーダー：#71 03 00（2 バイト、0–1023）
 *  - トランジション：71 03 0C（WIPE / MIX / CUT）、時間 71 00 17
 *  - AUTO：CTRL BUTTON 73 04 00 に 13H（[AUTO] 押下）→ 53H（離す）【事実：p.21】。CUT 専用トリガは無し（PGM/PST モードで A を直接書く）
 *  - PinP / SPLIT：71 03 0A / 0B（ON/OFF のみ、ソース無し）→ pinpCount 0、split は SPLIT ボタン
 *  - DSK：71 00 1F ON/OFF、71 00 20 SOURCE（INPUT 1–4, STILL）、71 00 21 TYPE。PVW・時間無し
 *  - オーディオ：71 01 00–06 入力レベル（1 バイト 0–127、ミュート無し）、71 01 07 MASTER
 *  - メモリー：73 01 00（00–07 ロード。RQ1 で現在番号 00–07 が返る）、名前無し、8 個
 *  - タリー・ラベル・マクロ：無し。バージョン 70 00 00（9 文字 ASCII）
 */

function buildSources(): SourceDef[] {
  return [
    { code: 0, name: 'INPUT 1', labelAddr: null },
    { code: 1, name: 'INPUT 2', labelAddr: null },
    { code: 2, name: 'INPUT 3', labelAddr: null },
    { code: 3, name: 'INPUT 4', labelAddr: null },
    { code: 4, name: 'STILL', labelAddr: null },
  ];
}

const AUDIO_INPUTS = [
  { x: 0x00, short: 'SDI 1' },
  { x: 0x01, short: 'SDI 2' },
  { x: 0x02, short: 'SDI 3' },
  { x: 0x03, short: 'HDMI 3' },
  { x: 0x04, short: 'HDMI 4' },
  { x: 0x05, short: 'AUDIO IN' },
  { x: 0x06, short: 'MIC' },
] as const;

export const v1sdi: DeviceProfile = {
  model: 'V-1SDI',
  verName: 'V-1SDI',
  sysexModelId: [0x00, 0x00, 0x00, 0x31],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: true, tallySubscribe: false, usb: true, ble: false, split: true, macro: false, sequencer: false },

  inputCount: 4,
  bankSize: 4,
  columns: 4,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 1,
  splitCount: 1,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['WIPE', 'MIX', 'CUT'],
  audioLevelCodec: 'u7',
  version: { addr: addr(0x70, 0x00, 0x00), size: 9, kind: 'ascii' },
  faderMax: 1023,

  addrs: {
    pgm: addr(0x71, 0x03, 0x08),
    pst: addr(0x71, 0x03, 0x09),
    fader: addr(0x71, 0x03, 0x00),
    transType: addr(0x71, 0x03, 0x0c),
    transTime: addr(0x71, 0x00, 0x17),
    inputAssign: null,
    pinp: () => ({ pgm: addr(0x71, 0x03, 0x0a), pvw: null, source: null, time: null }),
    dsk: () => ({
      pgm: addr(0x71, 0x00, 0x1f),
      pvw: null,
      source: addr(0x71, 0x00, 0x20),
      type: addr(0x71, 0x00, 0x21),
      time: null,
    }),
    split: () => addr(0x71, 0x03, 0x0b),
    audioLevel: (x) => addr(0x71, 0x01, x),
    audioMute: null,
    masterLevel: addr(0x71, 0x01, 0x07),
    masterMute: null,
    memLoad: addr(0x73, 0x01, 0x00),
    memCurrent: addr(0x73, 0x01, 0x00),
    memName: null,
    tallyBlock: null,
    tallyBlockSize: 0,
    // CUT 専用トリガ無し。AUTO は CTRL BUTTON（73 04 00）に [AUTO] 13H → 53H
    cut: null,
    auto: addr(0x73, 0x04, 0x00),
    autoValues: { press: 0x13, release: 0x53 },
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
