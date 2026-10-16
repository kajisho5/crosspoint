import type { DeviceProfile, SourceDef, TallyState } from './types';
import { VA } from './virtual';

/**
 * V-60HD プロファイル（LAN テキストコマンド。SysEx 無し）。根拠：V-60HD Reference Manual v3.1 p.20–23（LAN/RS-232 Command Reference）。
 * 転記：tools/guide/notes/v60hd.md。仮想アドレス（core/profiles/virtual.ts）をコマンドに変換するのは core/codec/textCommandMap.ts
 *  - LAN：CONTROL 端子、TCP 8023、認証の記載無し【不明】、コマンドは `stxPGM:a;`（stx = 02H）、ack = 06H
 *  - PGM/PST/AUX：`PGM:a;` 等、a = 0–7（SDI IN 1–4, HDMI IN 5, HDMI/RGB IN 6, STILL/BKG 7–8）。クロスポイント無し（物理入力直指定）
 *  - トランジション：`TRS:a;`（MIX / WIPE 1 / WIPE 2）、`TIM:a;`（0–40）。CUT / AUTO：`CUT;` / `ATO;`
 *  - PinP 1：`P1S;`（トグル。状態は QPL:7 の 4 番目）。DSK：`DSK;`（トグル、QPL の 5 番目）、PVW は `DVW;`（状態読めず）
 *  - オーディオ：`IAL:a,b;`（a = 0–10、b = 0.1 dB 単位、-801 = -INF）、`OAL:a;`。ミュートは `IAM:a;` のトグルで状態が読めない → 非表示
 *  - メモリー：`MEM:a;`（0–7）。現在番号・名前無し
 *  - タリー：`TLY;` → 8 値（0 消灯 / 1 赤 / 2 緑）
 *  - T バー：QPL:6 で読めるが書けない → 非表示
 */

function buildSources(): SourceDef[] {
  return [
    { code: 0, name: 'SDI 1', labelAddr: null },
    { code: 1, name: 'SDI 2', labelAddr: null },
    { code: 2, name: 'SDI 3', labelAddr: null },
    { code: 3, name: 'SDI 4', labelAddr: null },
    { code: 4, name: 'HDMI 5', labelAddr: null },
    { code: 5, name: 'HDMI/RGB 6', labelAddr: null },
    { code: 6, name: 'STILL 7', labelAddr: null },
    { code: 7, name: 'STILL 8', labelAddr: null },
  ];
}

const AUDIO_INPUTS = [
  { x: 0, short: 'IN 1' },
  { x: 1, short: 'IN 2' },
  { x: 2, short: 'IN 3' },
  { x: 3, short: 'IN 4' },
  { x: 4, short: 'IN 5/6' },
  { x: 5, short: 'SDI 1' },
  { x: 6, short: 'SDI 2' },
  { x: 7, short: 'SDI 3' },
  { x: 8, short: 'SDI 4' },
  { x: 9, short: 'HDMI 5' },
  { x: 10, short: 'HDMI 6' },
] as const;

function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const v60hd: DeviceProfile = {
  model: 'V-60HD',
  verName: 'V-60HD',
  protocol: 'text',
  sysexModelId: [],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: true, tallySubscribe: false, usb: false, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 8,
  bankSize: 8,
  columns: 4,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 1,
  dskCount: 1,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['MIX', 'WIPE 1', 'WIPE 2'],
  audioLevelCodec: 'db3',
  version: { addr: VA.pgm, size: 1, kind: 'ascii' },
  faderMax: 2047,

  addrs: {
    pgm: VA.pgm,
    pst: VA.pst,
    fader: null,
    transType: VA.transType,
    transTime: VA.transTime,
    inputAssign: null,
    pinp: (n) => ({ pgm: VA.pinp(n), pvw: null, source: null, time: null }),
    dsk: () => ({ pgm: VA.dskPgm, pvw: null, source: null, time: null }),
    split: () => VA.pinp(2),
    audioLevel: (x) => VA.audioLevel(x),
    audioMute: null,
    masterLevel: VA.masterLevel,
    masterMute: null,
    memLoad: VA.memLoad,
    memCurrent: null,
    memName: null,
    tallyBlock: VA.tally,
    tallyBlockSize: 8,
    cut: VA.cut,
    auto: VA.auto,
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 0,

  assignToSource: (n) => n - 1,
  sourceToAssign: (n, code) => (code === n - 1 ? 0 : null),
  encodeInput: (n) => n - 1,
  decodeInput: (value) => (value >= 0 && value <= 7 ? value + 1 : null),
  tallyOf: (n, bytes) => byteToTally(bytes[n - 1] ?? 0),
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
