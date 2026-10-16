import { useWindowDimensions } from 'react-native';
import { xp } from '@/theme/tokens';

/** 画面の左右余白（Screen 直下の px-4）＋ GroupCard 内側の px-4 */
export const INSET_PAGE = xp.sidePadding * 2;
export const INSET_CARD = INSET_PAGE + 16 * 2;

/**
 * 等幅グリッドのボタン幅（pt）。画面幅から余白と gap を引いて列数で割る。
 * flex: 1 に頼ると端末によってラベル長で伸縮するため（CrosspointGrid と同じ理由）、明示幅で固定する（SPEC §11：均等グリッド）。
 */
export function useColumnWidth(columns: number, inset: number, gap: number = xp.gap): number {
  const { width } = useWindowDimensions();
  return Math.max(0, Math.floor((width - inset - gap * (columns - 1)) / columns));
}
