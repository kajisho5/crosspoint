import type { Addr } from '../codec/value';

export type ModelId = 'V-160HD' | 'V-80HD' | 'VR-120HD' | 'VR-6HD' | 'V-1-4K' | 'V-8HD' | 'V-1HD' | 'V-1SDI' | 'VR-4HD' | 'V-02HD-MK2' | 'V-60HD' | 'V-600UHD' | 'VR-50HD-MK2';

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
  /** PVW スイッチが無い機種（V-02HD MK II の PinP/KEY、VR-4HD の KEY）は null → PVW ピルを出さない */
  pvw: Addr | null;
  /** ソース指定が無い機種は null */
  source: Addr | null;
  /** 時間が無い機種は null */
  time: Addr | null;
  /** DSK のみ：キータイプ（LUMA/CHROMA 表示用） */
  type?: Addr;
}

export interface DeviceProfile {
  model: ModelId;
  /** VER 応答の機種名 */
  verName: string;
  /**
   * 制御方式：'sysex' = アドレスマップ（DTH/RQH・MIDI SysEx）、'text' = LAN の 3 文字テキストコマンドのみ
   * （V-60HD / V-600UHD / VR-50HD MK II。addrs は core/profiles/virtual.ts の仮想アドレス）
   */
  protocol: 'sysex' | 'text';
  /** SysEx モデル ID（V-160HD 5byte / V-80HD 3byte）。'text' 機種は空 */
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

  /** T バー（AB Fader）の最大値（V-160HD 系 2047、V-1-4K 4095、V-1HD/V-1SDI 1023、V-02HD MK II 511） */
  faderMax: number;
  /** トランジションタイプの列挙（transType に書く index 順。V-160HD 系 MIX/WIPE、V-1HD/V-1SDI WIPE/MIX/CUT、VR-4HD CUT/MIX/WIPE） */
  transTypes: readonly string[];
  /** オーディオレベルの符号化：'db3' = 3 バイト 0.1dB（-INF あり）、'u7' = 1 バイト 0–127（V-1HD / V-1SDI） */
  audioLevelCodec: 'db3' | 'u7';
  /** バージョン読出し（MIDI 接続確認で RQ1 する）：'digits' = 数字バイト列（02 00 00、6 バイト）、'ascii' = ASCII 文字列（70 00 00 等、8 バイト） */
  version: { addr: Addr; size: number; kind: 'digits' | 'ascii' };

  addrs: {
    pgm: Addr;
    /** PST/PVW バス。無い機種（VR-4HD：PGM 書込で遷移、V-02HD MK II：背景チャンネル＋フェーダー）は null → PST グリッドを出さない */
    pst: Addr | null;
    /** T バー。無い機種は null */
    fader: Addr | null;
    transType: Addr | null;
    transTime: Addr;
    /** INPUT ASSIGN。クロスポイントが無く物理入力直指定の機種（V-1HD / V-1SDI / VR-4HD / V-02HD MK II）は null */
    inputAssign: ((n: number) => Addr) | null;
    pinp: (n: number) => KeyAddrs;
    dsk: (n: number) => KeyAddrs;
    split: (n: number) => Addr;
    audioLevel: (x: number) => Addr;
    /** ミュートが無い機種（V-1HD / V-1SDI）は null */
    audioMute: ((x: number) => Addr) | null;
    masterLevel: Addr;
    masterMute: Addr | null;
    memLoad: Addr;
    /** 現在のメモリー番号（読出し）。無い機種は null */
    memCurrent: Addr | null;
    /** メモリー名（8 文字）。無い機種は null */
    memName: ((n: number) => Addr) | null;
    /** タリーブロック。無い機種は null（tallyBlockSize 0） */
    tallyBlock: Addr | null;
    tallyBlockSize: number;
    cut: Addr | null;
    auto: Addr | null;
    /** CUT/AUTO に書く値（既定 press=1 / release=0。V-1SDI の CTRL BUTTON は AUTO=13H/53H） */
    cutValues?: { press: number; release: number };
    autoValues?: { press: number; release: number };
    /** マクロ実行トリガ（値 = マクロ番号 − 1、書込み専用）。不明な機種は null */
    macroTrigger: Addr | null;
    /** シーケンサーのパネルスイッチ（モーメンタリ）。不明な機種は null */
    sequencer: { on: Addr; auto: Addr; prev: Addr; next: Addr } | null;
  };
  /** マクロ数（capabilities.macro が真のとき） */
  macroCount: number;

  /**
   * INPUT ASSIGN の値 ⇄ ソース code（sources[].code）。既定は同一（V-160HD 系）。
   * V-1-4K は割当値が相対（00 = その番号の HDMI IN、01–02 STILL、03 BLACK）なので変換が要る。
   * sourceToAssign が null を返すソースはその INPUT に割り当てられない（設定シートに出さない）
   */
  assignToSource: (n: number, value: number) => number | null;
  sourceToAssign: (n: number, code: number) => number | null;
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
