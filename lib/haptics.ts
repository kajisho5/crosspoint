import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/stores/settings';

/** 設定でオフにできるハプティクス（F9）。失敗しても操作は止めない */
function enabled(): boolean {
  return useSettingsStore.getState().haptics;
}

export const haptic = {
  /** クロスポイント選択・トグル */
  select(): void {
    if (!enabled()) return;
    Haptics.selectionAsync().catch(() => undefined);
  },
  /** CUT / AUTO */
  impact(): void {
    if (!enabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  /** Tバー端・長押し確定 */
  heavy(): void {
    if (!enabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  },
  success(): void {
    if (!enabled()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning(): void {
    if (!enabled()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
