import { addr } from '../codec/value';
import type { DeviceProfile, SourceDef, TallyState } from './types';

/**
 * V-8HD プロファイル。根拠：V-8HD Reference Manual v3（MIDI Implementation Version 3.00 / 2024-11-20、p.99–117）、
 * V-8HD Remote Connection Guide v2。転記：tools/guide/notes/v8hd.md
 *  - 接続：REMOTE 端子（USB B）のみ。LAN / Bluetooth / RS-232 / MIDI DIN 無し。USB MIDI クラスの明記は無い【推測】→ 実機確認（§13）
 *  - MIDI Model ID：00H 00H 00H 68H（4 バイト）、Device ID 10H、DT1 12H / RQ1 11H
 *  - PGM/PST/AUX：00 12 00 / 01 / 02（値 00–07 = INPUT 1–8）。フェーダー 00 12 03（2 バイト 0–2047）
 *  - INPUT n ASSIGN：00 (n−1) 00（00 = HDMI n、01–08 = STILL 1–8）→ 割当値は相対（assignToSource で変換）
 *  - CUT / AUTO ボタン：0B 00 18 / 19（1 押下 / 0 解放）【事実】。時間指定 AUTO TAKE は 0A 20 00
 *  - トランジション：00 0C 00（MIX/WIPE）、MIX/WIPE TIME 00 0B 00
 *  - PinP 1/2：00 0D/0E xx（00 PGM SW, 01 PVW SW, 02 SOURCE 00–0F, 03 TYPE）、時間 00 0B 01/02
 *  - DSK：00 0F xx（00 PGM SW, 01 PVW SW, 02 SOURCE, 03 TYPE）、時間 00 0B 03
 *  - SPLIT/VFX A/B：00 10/11 00 SW
 *  - オーディオ入力：01 xx 00–02 LEVEL（xx = 00–07 HDMI IN 1–8、08 AUDIO IN）、01 xx 03 MUTE。MASTER 01 11 00–02 / 03
 *  - メモリー：0A 00 00 LOAD（write only）、0A 00 03 現在番号、名前 60 xx 00、24 個
 *  - タリー：0C 00 00、8 バイト（HDMI IN 1–8 の OFF/PGM/PST）。INPUT n ≒ HDMI n として表示【推測：INPUT の割当が HDMI n 以外のときは本体 PGM/PST 値から合成】
 *  - ラベル：02 xx 00–07（xx = 10–17 HDMI 1–8、18–1F STILL 1–8）
 *  - マクロ：50 05 04 EXEC MACRO TRIGGER（00–63 = MACRO 1–100）【事実】。シーケンサー専用アドレスは無し
 */

/** ソース code：HDMI 1–8 = 0–7、STILL 1–8 = 8–15（PGM/PST は INPUT 番号しか取らないので、code は割当の表示用） */
function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  for (let i = 0; i < 8; i += 1) out.push({ code: i, name: `HDMI ${i + 1}`, labelAddr: addr(0x02, 0x10 + i, 0x00) });
  for (let i = 0; i < 8; i += 1) out.push({ code: 8 + i, name: `STILL ${i + 1}`, labelAddr: addr(0x02, 0x18 + i, 0x00) });
  return out;
}

const AUDIO_INPUTS = [
  ...Array.from({ length: 8 }, (_, i) => ({ x: 0x00 + i, short: `HDMI ${i + 1}` })),
  { x: 0x08, short: 'AUDIO IN' },
] as const;

function byteToTally(v: number): TallyState {
  if (v === 1) return 'pgm';
  if (v === 2) return 'pst';
  return 'off';
}

export const v8hd: DeviceProfile = {
  model: 'V-8HD',
  verName: 'V-8HD',
  protocol: 'sysex',
  sysexModelId: [0x00, 0x00, 0x00, 0x68],
  passwordLength: 4,
  lanAck: 'byte06',
  capabilities: { cutAuto: true, tallySubscribe: false, usb: true, ble: false, split: true, macro: true, sequencer: false },

  inputCount: 8,
  bankSize: 8,
  columns: 4,

  memoryCount: 24,
  memoryNoun: 'メモリー',

  pinpCount: 2,
  dskCount: 1,
  splitCount: 2,

  sources: buildSources(),
  audioInputs: AUDIO_INPUTS,
  transTypes: ['MIX', 'WIPE'],
  audioLevelCodec: 'db3',
  version: { addr: addr(0x02, 0x00, 0x00), size: 3, kind: 'digits' },
  faderMax: 2047,

  addrs: {
    pgm: addr(0x00, 0x12, 0x00),
    pst: addr(0x00, 0x12, 0x01),
    fader: addr(0x00, 0x12, 0x03),
    transType: addr(0x00, 0x0c, 0x00),
    transTime: addr(0x00, 0x0b, 0x00),
    inputAssign: (n) => addr(0x00, n - 1, 0x00),
    pinp: (n) => {
      const mid = 0x0d + (n - 1);
      return {
        pgm: addr(0x00, mid, 0x00),
        pvw: addr(0x00, mid, 0x01),
        source: addr(0x00, mid, 0x02),
        time: addr(0x00, 0x0b, 0x01 + (n - 1)),
      };
    },
    dsk: () => ({
      pgm: addr(0x00, 0x0f, 0x00),
      pvw: addr(0x00, 0x0f, 0x01),
      source: addr(0x00, 0x0f, 0x02),
      type: addr(0x00, 0x0f, 0x03),
      time: addr(0x00, 0x0b, 0x03),
    }),
    split: (n) => addr(0x00, 0x10 + (n - 1), 0x00),
    audioLevel: (x) => addr(0x01, x, 0x00),
    audioMute: (x) => addr(0x01, x, 0x03),
    masterLevel: addr(0x01, 0x11, 0x00),
    masterMute: addr(0x01, 0x11, 0x03),
    memLoad: addr(0x0a, 0x00, 0x00),
    memCurrent: addr(0x0a, 0x00, 0x03),
    memName: (n) => addr(0x60, n - 1, 0x00),
    tallyBlock: addr(0x0c, 0x00, 0x00),
    tallyBlockSize: 8,
    cut: addr(0x0b, 0x00, 0x18),
    auto: addr(0x0b, 0x00, 0x19),
    macroTrigger: addr(0x50, 0x05, 0x04),
    macroPreview: addr(0x50, 0x05, 0x05),
    sequencer: null,
  },
  macroCount: 100,

  // INPUT n ASSIGN：00 = HDMI n、01–08 = STILL 1–8
  assignToSource: (n, value) => {
    if (value === 0) return n - 1;
    if (value >= 1 && value <= 8) return 8 + (value - 1);
    return null;
  },
  sourceToAssign: (n, code) => {
    if (code <= 7) return code === n - 1 ? 0 : null;
    if (code >= 8 && code <= 15) return code - 8 + 1;
    return null;
  },
  encodeInput: (n) => n - 1,
  decodeInput: (value) => (value >= 0 && value <= 7 ? value + 1 : null),
  tallyOf: (n, bytes) => byteToTally(bytes[n - 1] ?? 0),
  tallyIndexOf: (n) => n - 1,
  encodeTally: (t) => ({ off: 0, pgm: 1, pst: 2, both: 1 })[t],
};
