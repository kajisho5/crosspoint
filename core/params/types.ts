/**
 * Remote Control Guide 由来の全パラメータ定義（tools/guide/normalize.py が生成する JSON の型）。
 * 根拠は公開ガイドのみ（SPEC §0 ルール8）。生成元：tools/guide/*.raw.json（ガイド PDF の表を機械的に抽出したもの）。
 */

export type ParamArea = 'video' | 'audio' | 'system' | 'panel' | 'other' | 'tally' | 'name';

export type ParamKind = 'bool' | 'enum' | 'int' | 'level' | 'text' | 'unknown';

export interface ParamDefBase {
  id: string;
  name: string;
  /** アドレス（16 進 2 桁。a2 は 'xx' = グループの instances で決まる） */
  a1: string;
  a2: string;
  a3: string;
  size: number;
  sysex: string;
  meaning: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  /** 書くと実行されるトリガ（PRESET RECALL 等） */
  exec?: boolean;
}

export interface BoolParam extends ParamDefBase {
  kind: 'bool';
  labels: [string, string] | string[];
}

export interface EnumParam extends ParamDefBase {
  kind: 'enum';
  /** raw 値（符号付きの場合は負もある） */
  values: number[];
  labels: string[];
  /** ガイドの値数とラベル数が合わない（表記ゆれ）。表示は labels の範囲で行う */
  mismatch?: boolean;
}

export interface IntParam extends ParamDefBase {
  kind: 'int';
  /** 表示値の範囲 */
  min: number;
  max: number;
  /** raw 値の範囲（signed なら負） */
  rawMin: number;
  rawMax: number;
  /** 表示値 = raw × scale */
  scale: number;
  unit: string;
  signed: boolean;
  /** raw = zeroRaw のとき zeroLabel を表示（例 OFF, 1–120sec） */
  zeroLabel?: string;
  zeroRaw?: number;
  /** 意味欄が無く raw をそのまま編集する */
  raw?: boolean;
}

export interface LevelParam extends ParamDefBase {
  kind: 'level';
  min: number;
  max: number;
  scale: number;
  unit: 'dB';
}

export interface TextParam extends ParamDefBase {
  kind: 'text';
}

export interface UnknownParam extends ParamDefBase {
  kind: 'unknown';
  rawMin?: number;
  rawMax?: number;
}

export type ParamDef = BoolParam | EnumParam | IntParam | LevelParam | TextParam | UnknownParam;

export interface ParamInstance {
  /** a2 に入る値 */
  xx: number;
  label: string;
}

export interface ParamGroup {
  id: string;
  title: string;
  area: ParamArea;
  instances: ParamInstance[] | null;
  params: ParamDef[];
  warning?: string;
}

export interface ParamCatalog {
  model: string;
  groups: ParamGroup[];
}
