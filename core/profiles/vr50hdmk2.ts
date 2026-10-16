import type { DeviceProfile, SourceDef } from './types';
import { VA } from './virtual';

/**
 * VR-50HD MK II プロファイル（LAN テキストコマンド。SysEx 無し）。根拠：VR-50HD MK II Reference Manual eng02 p.60–62。
 * 転記：tools/guide/notes/vr50hdmk2.md
 *  - LAN：TCP 8023、認証の記載無し、`stxPGM:a;`（stx = 02H）、ack = 06H
 *  - PGM：`PGM:a;`（0–3 = INPUT 1–4、4 = STILL）。送ると現在の TRS / TIM でトランジション【推測】。PST バス・T バー無し
 *  - トランジション：`TRS:a;`（CUT / MIX / WIPE）、`TIM:a;`。CUT/AUTO の専用コマンド無し → TRS で種別を決めて PGM を書く
 *  - PinP / PinP-KEY / STILL KEY：`PIP:a;` `PKY:a;` `SKY:a;`（ON/OFF、状態読めず）→ 非表示（全パラメータメニュー対象外）
 *  - オーディオ：`LM1`–`LM4`（ch 1–4）、`LS1`–`LS4`（ch 5/6 … 11/12）、`LMN`（MAIN）。値 0–127（1 バイト）。ミュート無し
 *  - メモリー：`MEM:a;`（0–7）。AUX：`AUX:a;`。読出し：`QPG;` → `QPG:a;`（PGM のみ）、`VER;`
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
  { x: 0, short: 'CH 1' },
  { x: 1, short: 'CH 2' },
  { x: 2, short: 'CH 3' },
  { x: 3, short: 'CH 4' },
  { x: 4, short: 'CH 5/6' },
  { x: 5, short: 'CH 7/8' },
  { x: 6, short: 'CH 9/10' },
  { x: 7, short: 'CH 11/12' },
] as const;

export const vr50hdmk2: DeviceProfile = {
  model: 'VR-50HD-MK2',
  verName: 'VR-50HDMK2',
  protocol: 'text',
  sysexModelId: [],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: false, tallySubscribe: false, usb: false, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 5,
  bankSize: 5,
  columns: 5,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 0,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['CUT', 'MIX', 'WIPE'],
  audioLevelCodec: 'u7',
  version: { addr: VA.pgm, size: 1, kind: 'ascii' },
  faderMax: 2047,

  addrs: {
    pgm: VA.pgm,
    pst: null,
    fader: null,
    transType: VA.transType,
    transTime: VA.transTime,
    inputAssign: null,
    pinp: () => ({ pgm: VA.pinp(1), pvw: null, source: null, time: null }),
    dsk: () => ({ pgm: VA.dskPgm, pvw: null, source: null, time: null }),
    split: () => VA.pinp(2),
    audioLevel: (x) => VA.audioLevel(x),
    audioMute: null,
    masterLevel: VA.masterLevel,
    masterMute: null,
    memLoad: VA.memLoad,
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
  decodeInput: (value) => (value >= 0 && value <= 4 ? value + 1 : null),
  tallyOf: () => 'off',
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
