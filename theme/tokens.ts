import { Platform, PlatformColor, type ColorValue, type TextStyle } from 'react-native';

/**
 * 色・寸法・文字のトークン（SPEC §11）。
 * 色は iOS の semantic system color を PlatformColor で参照し、値をハードコードしない。
 * 第2引数はテスト環境・iOS 以外での表示用フォールバック（ボードの Dark 値）で、iOS では使われない。
 * UI コードは必ずこの `color` を経由し、hex を直接書かない。
 */
function sys(name: string, fallback: string): ColorValue {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export const color = {
  bg: sys('systemBackground', '#000000'),
  group: sys('secondarySystemBackground', '#1C1C1E'),
  fill: sys('tertiarySystemBackground', '#2C2C2E'),
  fill2: sys('systemGray4', '#3A3A3C'),
  sep: sys('separator', '#38383A'),
  label: sys('label', '#FFFFFF'),
  label2: sys('secondaryLabel', '#EBEBF599'),
  label3: sys('tertiaryLabel', '#EBEBF54D'),
  pgm: sys('systemRed', '#FF3B30'),
  pst: sys('systemGreen', '#30D158'),
  accent: sys('systemBlue', '#0A84FF'),
  warn: sys('systemOrange', '#FF9F0A'),
  gray: sys('systemGray', '#8E8E93'),
  /**
   * 色付き塗り（PGM/PST/アクセント）上の文字。UIKit のボタン既定と同じ UIColor.white。
   * PlatformColor は semantic 名しか解決しない（'white' / 'black' は nil → 透明になり、選択中ボタンの文字が消えた）ので、
   * ここだけ固定値。ライト/ダークで変えない色なので semantic にする意味も無い（SPEC §11 の例外）
   */
  onTint: '#FFFFFF' as ColorValue,
  /** フェーダーのつまみ（固定の白。同上） */
  knob: '#FFFFFF' as ColorValue,
  /** 下地を暗くするスクリム（固定の黒。同上） */
  scrim: '#000000' as ColorValue,
} as const;

export type ColorToken = keyof typeof color;

/** 角丸（tailwind.config.js の borderRadius と同値） */
export const radius = {
  xp: 12,
  card: 10,
  big: 18,
  pill: 999,
} as const;

/** クロスポイントボタン（SPEC §11：66×58pt、間隔 8） */
export const xp = {
  height: 58,
  gap: 8,
  sidePadding: 16,
} as const;

/** 最小タップ領域（HIG：44×44pt） */
export const MIN_TAP = 44;

export const font = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

/** ボードの文字スケール（SPEC §11 / board：Components & Tokens） */
export const type = {
  largeTitle: { fontSize: 28, fontWeight: '700' } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700' } satisfies TextStyle,
  headline: { fontSize: 17, fontWeight: '600' } satisfies TextStyle,
  body: { fontSize: 17, fontWeight: '400' } satisfies TextStyle,
  callout: { fontSize: 16, fontWeight: '600' } satisfies TextStyle,
  subhead: { fontSize: 15, fontWeight: '400' } satisfies TextStyle,
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6 } satisfies TextStyle,
  footnote: { fontSize: 13, fontWeight: '400' } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '500' } satisfies TextStyle,
  caption2: { fontSize: 11, fontWeight: '500' } satisfies TextStyle,
} as const;
