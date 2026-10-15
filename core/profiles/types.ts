import type { Addr } from '../codec/value';

export type ModelId = 'V-160HD' | 'V-80HD';

export type TallyState = 'off' | 'pgm' | 'pst' | 'both';

export type KeyKind = 'pinp' | 'dsk';

/** 物理ソース（HDMI / SDI / STILL など）。code はアドレスマップ上の値 */
export interface SourceDef {
  code: number;
  /** 既定の表示名（ラベル未取得時） */
  name: string;
  /** 8 文字ラベルのアドレス（無いソースは null） */
  labelAddr: Addr | null;
}

export interface AudioChannelDef {
  /** アドレス中位バイト（01 {x} …） */
  x: number;
  /** ストリップ表示名 */
  short: string;
}

/** 機種ごとの機能有無（SPEC §9-5） */
export interface Capabilities {
  cutAuto: boolean;
  tallySubscribe: boolean;
  usb: boolean;
  ble: boolean;
  split: boolean;
  /** マクロ実行（`macroTrigger` が分かっている機種だけ真）。V-160HD は Companion の run_macro（50 05 04）【事実：公開 OSS】 */
  macro: boolean;
  /** シーケンサーのパネルスイッチ（ON/AUTO/PREV/NEXT）が分かっている機種だけ真 */
  sequencer: boolean;
}

export interface KeyAddrs {
  pgm: Addr;
  pvw: Addr;
  source: Addr;
  time: Addr;
  /** DSK のみ：キータイプ（LUMA/CHROMA 表示用） */
  type?: Addr;
}

export interface DeviceProfile {
  model: ModelId;
  /** VER 応答の機種名 */
  verName: string;
  /** SysEx モデル ID（V-160HD 5byte / V-80HD 3byte） */
  sysexModelId: readonly number[];
  passwordLength: 4 | 8;
  /** LAN の書込応答形式 */
  lanAck: 'byte06' | 'asciiACK';
  capabilities: Capabilities;

  /** クロスポイント（INPUT）総数・1 バンクの数・列数 */
  inputCount: number;
  bankSize: number;
  columns: number;

  memoryCount: number;
  /** 画面表記（V-160HD「メモリー」/ V-80HD「シーン」） */
  memoryNoun: 'メモリー' | 'シーン';

  pinpCount: number;
  dskCount: number;
  splitCount: number;

  sources: readonly SourceDef[];
  audioInputs: readonly AudioChannelDef[];

  addrs: {
    pgm: Addr;
    pst: Addr;
    fader: Addr;
    transType: Addr;
    transTime: Addr;
    inputAssign: (n: number) => Addr;
    pinp: (n: number) => KeyAddrs;
    dsk: (n: number) => KeyAddrs;
    split: (n: number) => Addr;
    audioLevel: (x: number) => Addr;
    audioMute: (x: number) => Addr;
    masterLevel: Addr;
    masterMute: Addr;
    memLoad: Addr;
    memCurrent: Addr;
    memName: (n: number) => Addr;
    tallyBlock: Addr;
    tallyBlockSize: number;
    cut: Addr | null;
    auto: Addr | null;
    /** マクロ実行トリガ（値 = マクロ番号 − 1、書込み専用）。不明な機種は null */
    macroTrigger: Addr | null;
    /** シーケンサーのパネルスイッチ（モーメンタリ）。不明な機種は null */
    sequencer: { on: Addr; auto: Addr; prev: Addr; next: Addr } | null;
  };
  /** マクロ数（capabilities.macro が真のとき） */
  macroCount: number;

  /** INPUT n（1 始まり）→ PGM/PST に書く値 */
  encodeInput: (n: number) => number;
  /** PGM/PST の値 → INPUT n（判定できなければ null） */
  decodeInput: (value: number, assignOf: (n: number) => number | undefined) => number | null;
  /** INPUT n のタリー（tallyBytes は tallyBlock から読んだ列） */
  tallyOf: (n: number, tallyBytes: readonly number[]) => TallyState;
  /** タリーブロックで INPUT n の値を置くインデックス（モック用） */
  tallyIndexOf: (n: number) => number;
  /** タリーブロック 1 バイトの書き方（モック用） */
  encodeTally: (t: TallyState) => number;
}
