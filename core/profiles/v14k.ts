import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * V-1-4K プロファイル。根拠：V-1-4K Remote Control Guide eng01（MIDI Implementation Version 1.00 / 2026-04-09）、
 * V-1-4K Remote Connection Guide eng01、Reference Manual eng01、LAN/RS-232 Basic Control Commands eng02。
 *  - MIDI Model ID：01H 06H 10H（3 バイト）、Device ID 10H
 *  - LAN：LAN CONTROL 端子、TCP 8023、NETWORK PASSWORD **8 文字**、DTH/RQH/VER は V-160HD と同語彙。
 *    ack はガイドでは `stxACK;`（文字列）、簡易制御コマンド文書では `ACK;`+LF【事実：資料間で表記差】→ lanAck 'asciiACK'（LanParser は 06H も受ける）。
 *    認証プロンプト文字列は資料に無い【不明】→ V-160HD と同じ `Enter password:` を仮定（§13）
 *  - USB：USB STREAM（USB-C）「for remote control from computer and iPad」。USB MIDI クラスの明記は無い【不明】→ usb: true で実機確認
 *  - Bluetooth：無し
 *  - PGM/PST：00 12 00 / 01、値 = HDMI IN 1–5 (00–04), STILL 1–2 (05–06), INPUT 1–8 (07–0E), BLACK (0F)
 *  - フェーダー：00 12 02（2 バイト **0–4095**）
 *  - INPUT ASSIGN：00 00 00–07。値 = 00 その番号の HDMI IN（INPUT 1–5 のみ）, 01–02 STILL 1–2, 03 BLACK, 04 N/A
 *  - CUT/AUTO：0B 00 1A / 1B（ボタン押下 1 / 離す 0）【事実：ガイド p.17】
 *  - トランジション：00 0B 00（MIX/WIPE）、MIX TIME 00 0B 01
 *  - PinP&KEY：1 系統だが ON PGM/ON PVW・ソースの専用アドレスが無い（SW 00 0C 00、ソースは PST/B バス）→ pinpCount 0（SPEC §9-5）
 *  - DSK：00 10 00 SOURCE, 01 TIME, 02 PGM, 03 PVW, 04 TYPE
 *  - SPLIT：00 0F 00 SW（1 系統）
 *  - オーディオ入力：01 xx 02–04 LEVEL、01 xx 05 MUTE（xx = 01 AUDIO IN, 02 USB IN, 03–07 HDMI IN 1–5）。MAIN：01 21 00–02 / 03
 *  - メモリー：0A 00 00 LOAD（write only）、0A 00 03 現在番号、名前 60 xx 00、8 個
 *  - タリー：0C 00 00、15 バイト（HDMI 1–5, STILL 1–2, INPUT 1–8、OFF/PGM/PST）。INPUT n = 06H+n
 *  - ラベル：02 xx 00–07、xx = 20–24 HDMI IN 1–5, 25–26 STILL 1–2, 29 BLACK
 *  - マクロ・シーケンサー：無し（簡易制御コマンドも V-1-4K 非対応）
 */

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 5; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x20 + i, 0x00) });
  for (let i = 0; i < 2; i += 1) out.push({ code: 5 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x25 + i, 0x00) });
  out.push({ code: 0x0f, name: 'BLACK', labelAddr: addr(0x02, 0x29, 0x00) });
  return out;
}

/** Audio Input xx = 01H–07H（ガイド p.6 注記の順） */
const AUDIO_INPUTS = [
  { x: 0x01, short: 'AUDIO IN' },
  { x: 0x02, short: 'USB' },
  ...Array.from({ length: 5 }, (_, i) => ({ x: 0x03 + i, short: `HDMI ${i + 1}` })),
] as const;

function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const v14k: DeviceProfile = {
  model: 'V-1-4K',
  verName: 'V-1-4K',
  sysexModelId: [0x01, 0x06, 0x10],
  passwordLength: 8,
  lanAck: 'asciiACK',
  capabilities: { cutAuto: true, tallySubscribe: false, usb: true, ble: false, split: true, macro: false, sequencer: false },

  inputCount: 8,
  bankSize: 8,
  columns: 4,

  memoryCount: 8,
  memoryNoun: 'メモリー',

  pinpCount: 0,
  dskCount: 1,
  splitCount: 1,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  faderMax: 4095,

  addrs: {
    pgm: addr(0x00, 0x12, 0x00),
    pst: addr(0x00, 0x12, 0x01),
    fader: addr(0x00, 0x12, 0x02),
    transType: addr(0x00, 0x0b, 0x00),
    transTime: addr(0x00, 0x0b, 0x01),
    inputAssign: (n) => addr(0x00, 0x00, n - 1),
    // PinP&KEY は ON PGM / ON PVW / ソースの専用アドレスが無い（pinpCount = 0 なので呼ばれない）
    pinp: () => ({
      time: addr(0x00, 0x0b, 0x01),
      pgm: addr(0x00, 0x0c, 0x00),
      pvw: addr(0x00, 0x0c, 0x00),
      source: addr(0x00, 0x12, 0x01),
    }),
    dsk: () => ({
      source: addr(0x00, 0x10, 0x00),
      time: addr(0x00, 0x10, 0x01),
      pgm: addr(0x00, 0x10, 0x02),
      pvw: addr(0x00, 0x10, 0x03),
      type: addr(0x00, 0x10, 0x04),
    }),
    split: () => addr(0x00, 0x0f, 0x00),
    audioLevel: (x) => addr(0x01, x, 0x02),
    audioMute: (x) => addr(0x01, x, 0x05),
    masterLevel: addr(0x01, 0x21, 0x00),
    masterMute: addr(0x01, 0x21, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 15,
    cut: addr(0x0b, 0x00, 0x1a),
    auto: addr(0x0b, 0x00, 0x1b),
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 0,

  // INPUT ASSIGN：00 = その番号の HDMI IN（INPUT 1–5 のみ）、01–02 = STILL 1–2、03 = BLACK、04 = N/A
  assignToSource: (n, value) => {
    if (value === 0x00) return n <= 5 ? n - 1 : null;
    if (value === 0x01 || value === 0x02) return 0x05 + (value - 1);
    if (value === 0x03) return 0x0f;
    return null;
  },
  sourceToAssign: (n, code) => {
    if (code <= 0x04) return code === n - 1 ? 0x00 : null;
    if (code === 0x05 || code === 0x06) return code - 0x04;
    if (code === 0x0f) return 0x03;
    return null;
  },
  encodeInput: (n) => 0x06 + n,
  decodeInput: (value, assignOf) => {
    if (value >= 0x07 && value <= 0x0e) return value - 0x06;
    if (value <= 0x06 || value === 0x0f) {
      for (let n = 1; n <= 8; n += 1) {
        if (assignOf(n) === value) return n; // assignOf はソース code に変換済み（selectors.assignLookup）
      }
    }
    return null;
  },
  /** 並び：00–04 HDMI, 05–06 STILL, 07–0E INPUT 1–8 */
  tallyOf: (n, bytes) => byteToTally(bytes[0x06 + n] ?? 0),
  tallyIndexOf: (n) => 0x06 + n,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
