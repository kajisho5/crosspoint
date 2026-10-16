import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * VR-120HD プロファイル。根拠：VR-120HD リモート・コントロール・ガイド（日本語版 04、MIDI インプリメンテーション Version 2.00 / 2024-09-04）
 *  - MIDI Model ID：00H 00H 00H 00H 25H（5 バイト）
 *  - LAN：TCP 8023、ネットワーク・パスワード 4 桁、コマンドは V-160HD と同じ DTH/RQH/VER（ガイド p.44）。認証文字列は【推測：V-160HD と同じ】→ §13
 *  - PGM/PST：00 1B 00 / 01、値 = Hdmi In 1-6 (00–05), Sdi In 1-6 (06–0B), Still 1-16 (0C–1B), Video Player/SRT In (1C), Input 1-8 (1D–24)
 *  - フェーダー：00 1B 02（2 バイト 0–2047）
 *  - INPUT ASSIGN：00 00 00–07（Input 1–8）。ソース = HDMI In 1-6 (00–05), SDI In 1-6 (06–0B), Still 1-16 (0C–1B), VP/SRT (1C), Stream/Record Status 1/2 (1D/1E), Date&time (1F)
 *  - ラベル（Preview Label）：02 xx 00–07、xx = 20H–45H（HDMI In 1-6, SDI In 1-6, Still 1-16, Program, Sub Program, Preview, AUX 1-3, DSK 1-2 Source, SRT In）
 *  - タリー：0C 00 00–24（1 バイトずつ Off/PGM/PST、Input n = 1CH+n）。タリー購読（0C 01 00）はガイド未記載【不明】→ ポーリング
 *  - PinP&Key 1–4：00 15–18 xx、DSK 1–2：00 19–1A xx、SPLIT 1/2 SW：00 14 08 / 12
 *  - シーンメモリー：0A 00 00 Load Trigger / 0A 00 03 Loaded Number、名前 60 xx 00（8 文字）、32 個
 *  - CUT/AUTO（0B 領域）・マクロ実行・シーケンサーはガイド未記載【不明】→ 非表示
 */

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 6; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x20 + i, 0x00) });
  for (let i = 0; i < 6; i += 1) out.push({ code: 6 + i, name: `SDI ${i + 1}`, labelAddr: addr(0x02, 0x26 + i, 0x00) });
  for (let i = 0; i < 16; i += 1) out.push({ code: 12 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x2c + i, 0x00) });
  out.push({ code: 0x1c, name: 'VP/SRT', labelAddr: addr(0x02, 0x43, 0x00) });
  out.push({ code: 0x1d, name: 'S/R ST 1', labelAddr: null });
  out.push({ code: 0x1e, name: 'S/R ST 2', labelAddr: null });
  out.push({ code: 0x1f, name: 'DATE', labelAddr: null });
  return out;
}

/** Audio Input xx = 01H–18H（ガイド注記の順） */
const AUDIO_INPUTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 0x01 + i, short: `IN ${i + 1}` })),
  { x: 0x07, short: 'IN 7/8' },
  { x: 0x08, short: 'IN 9/10' },
  { x: 0x09, short: 'USB' },
  { x: 0x0a, short: 'BT' },
  { x: 0x0b, short: 'PLAYER' },
  ...Array.from({ length: 6 }, (_, i) => ({ x: 0x0c + i, short: `HDMI ${i + 1}` })),
  ...Array.from({ length: 6 }, (_, i) => ({ x: 0x12 + i, short: `SDI ${i + 1}` })),
  { x: 0x18, short: 'VP/SRT' },
] as const;

function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const vr120hd: DeviceProfile = {
  model: 'VR-120HD',
  verName: 'VR-120HD',
  sysexModelId: [0x00, 0x00, 0x00, 0x00, 0x25],
  passwordLength: 4,
  // ガイド p.43：ack は制御コード 06H【事実】
  lanAck: 'byte06',
  // USB/BLE は V-160HD と同じ MIDI SysEx（ガイド p.2）。端点名などは実機確認（§13）まで LAN 先行
  capabilities: { cutAuto: false, tallySubscribe: false, usb: false, ble: false, split: true, macro: false, sequencer: false },

  inputCount: 8,
  bankSize: 8,
  columns: 4,

  memoryCount: 32,
  memoryNoun: 'シーン',

  pinpCount: 4,
  dskCount: 2,
  splitCount: 2,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,

  faderMax: 2047,

  addrs: {
    pgm: addr(0x00, 0x1b, 0x00),
    pst: addr(0x00, 0x1b, 0x01),
    fader: addr(0x00, 0x1b, 0x02),
    transType: addr(0x00, 0x14, 0x00),
    transTime: addr(0x00, 0x14, 0x02),
    inputAssign: (n) => addr(0x00, 0x00, n - 1),
    pinp: (n) => {
      const mid = 0x15 + (n - 1);
      return {
        time: addr(0x00, mid, 0x00),
        pgm: addr(0x00, mid, 0x01),
        pvw: addr(0x00, mid, 0x02),
        source: addr(0x00, mid, 0x03),
      };
    },
    dsk: (n) => {
      const mid = 0x19 + (n - 1);
      return {
        time: addr(0x00, mid, 0x00),
        pgm: addr(0x00, mid, 0x01),
        pvw: addr(0x00, mid, 0x02),
        source: addr(0x00, mid, 0x04),
        type: addr(0x00, mid, 0x06),
      };
    },
    split: (n) => addr(0x00, 0x14, n === 1 ? 0x08 : 0x12),
    audioLevel: (x) => addr(0x01, x, 0x03),
    audioMute: (x) => addr(0x01, x, 0x06),
    masterLevel: addr(0x01, 0x21, 0x00),
    masterMute: addr(0x01, 0x21, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 37,
    cut: null,
    auto: null,
    macroTrigger: null,
    sequencer: null,
  },
  macroCount: 100,

  assignToSource: (_n, value) => value,
  sourceToAssign: (_n, code) => code,
  encodeInput: (n) => 0x1c + n,
  decodeInput: (value, assignOf) => {
    if (value >= 0x1d && value <= 0x24) return value - 0x1c;
    if (value <= 0x1c) {
      for (let n = 1; n <= 8; n += 1) {
        if (assignOf(n) === value) return n;
      }
    }
    return null;
  },
  /** 並び：00–0B HDMI/SDI, 0C–1B STILL, 1C VP/SRT, 1D–24 INPUT 1–8 */
  tallyOf: (n, bytes) => byteToTally(bytes[0x1c + n] ?? 0),
  tallyIndexOf: (n) => 0x1c + n,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
