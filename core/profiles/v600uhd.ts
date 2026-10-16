import type { DeviceProfile, SourceDef } from './types';
import { VA } from './virtual';

/**
 * V-600UHD プロファイル（LAN テキストコマンド。SysEx 無し）。根拠：V-600UHD Reference Manual eng07 p.57–59。
 * 転記：tools/guide/notes/v600uhd.md
 *  - LAN：TCP 8023。LAN では stx を付けない、ack は "ACK"+LF。Ver.3.00 でパスワード（4 文字）が追加されたが TCP 上の入力手順は資料に無い【不明】
 *    → 接続直後に `Enter password:` が来れば V-160HD と同じ手順で送る、来なければそのまま VER を送る
 *  - PGM/PST/AUX：`PGM:a;` 等、a = 0–7（XPT 1–8。既定 XPT n = Ch.n：HDMI/RGB 1, HDMI 2–4, SDI 5–6, STILL 1, PG/STILL 2）
 *  - トランジション：`TRS:a;`（WIPE 1–3, MIX）、`TIM:a;`。CUT / AUTO：`CUT;` / `ATO;`。出力フェード `FDE:a;`
 *  - COMPOSITION / DSK はボタン押下トグル（`CMP;` / `DSK;`）で状態が読めない → 非表示
 *  - オーディオ：`IAL:a,b;`（a = 0–7、並びは【推測】HDMI IN1–4, SDI IN5–6, AUDIO IN, TEST TONE）、`OAL:a;`
 *  - メモリー：`MEM:a;`（0–63 = 1-1 … 8-8）。読出しは VER のみ（タリー・現在値無し）
 */

function buildSources(): SourceDef[] {
  return [
    { code: 0, name: 'CH 1', labelAddr: null },
    { code: 1, name: 'CH 2', labelAddr: null },
    { code: 2, name: 'CH 3', labelAddr: null },
    { code: 3, name: 'CH 4', labelAddr: null },
    { code: 4, name: 'CH 5', labelAddr: null },
    { code: 5, name: 'CH 6', labelAddr: null },
    { code: 6, name: 'STILL 1', labelAddr: null },
    { code: 7, name: 'PG/STILL 2', labelAddr: null },
  ];
}

const AUDIO_INPUTS = [
  { x: 0, short: 'HDMI 1' },
  { x: 1, short: 'HDMI 2' },
  { x: 2, short: 'HDMI 3' },
  { x: 3, short: 'HDMI 4' },
  { x: 4, short: 'SDI 5' },
  { x: 5, short: 'SDI 6' },
  { x: 6, short: 'AUDIO IN' },
  { x: 7, short: 'TONE' },
] as const;

export const v600uhd: DeviceProfile = {
  model: 'V-600UHD',
  verName: 'V-600UHD',
  protocol: 'text',
  sysexModelId: [],
  passwordLength: 4,
  lanAck: 'asciiACK',
  capabilities: { cutAuto: true, tallySubscribe: false, usb: false, ble: false, split: false, macro: false, sequencer: false },

  inputCount: 8,
  bankSize: 8,
  columns: 4,

  memoryCount: 64,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 0,
  splitCount: 0,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['WIPE 1', 'WIPE 2', 'WIPE 3', 'MIX'],
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
  tallyOf: () => 'off',
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
