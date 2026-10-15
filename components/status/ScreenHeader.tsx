import { View } from 'react-native';
import { useConnectionStore } from '@/stores/connection';
import { color } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { ConnectionPill } from './ConnectionPill';

/** F11：デモ中は画面上部に常時表示 */
export function DemoBadge() {
  const demo = useConnectionStore((s) => s.demo);
  if (!demo) return null;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="デモモード"
      style={{ borderRadius: 6, borderWidth: 1.5, borderColor: color.warn, paddingHorizontal: 6, paddingVertical: 1 }}
    >
      <AppText variant="caption2" tone="warn" weight="700" maxFontSizeMultiplier={1.2}>
        デモ
      </AppText>
    </View>
  );
}

/**
 * タブ画面の見出し（ボード：副題 13pt＋大見出し 28pt、右上に ConnectionPill）。
 * trailing を渡すとスイッチャー用（機器名＋機種 22pt＋FW）になる
 */
export function ScreenHeader({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: string }) {
  return (
    <View className="flex-row items-end justify-between px-4 pb-3 pt-2">
      <View className="flex-1 pr-3">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <AppText variant="section" tone="label2" numberOfLines={1} style={{ flexShrink: 1 }}>
            {subtitle}
          </AppText>
          <DemoBadge />
        </View>
        <View className="flex-row items-baseline" style={{ gap: 10 }}>
          <AppText variant={trailing ? 'title' : 'largeTitle'} accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </AppText>
          {trailing ? (
            <AppText variant="footnote" tone="label2" mono weight="500">
              {trailing}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={{ marginBottom: 4 }}>
        <ConnectionPill />
      </View>
    </View>
  );
}
