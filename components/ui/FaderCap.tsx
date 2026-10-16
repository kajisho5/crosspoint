import { View } from 'react-native';
import { color } from '@/theme/tokens';

/**
 * 卓のフェーダーキャップ風のつまみ（オーディオ・Tバー共通）。
 * 暗い本体＋縁取り、上下のグリップ溝、中央の指示線（accent で色を変える）。色は semantic system color のみ。
 */
export function FaderCap({ width, height, accent = 'label' }: { width: number; height: number; accent?: 'label' | 'accent' | 'gray' }) {
  const line = accent === 'accent' ? color.accent : accent === 'gray' ? color.gray : color.label;
  const grooves = Math.max(2, Math.floor((height - 10) / 2 / 5));
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor: color.fill2,
        borderWidth: 1,
        borderColor: color.sep,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        shadowColor: color.scrim,
        shadowOpacity: 0.55,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height / 2, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color.fill, opacity: 0.6 }} />
      <View style={{ gap: 3, alignItems: 'center' }}>
        {Array.from({ length: grooves }, (_, i) => (
          <View key={i} style={{ width: width - 12, height: 1, backgroundColor: color.scrim, opacity: 0.55 }} />
        ))}
      </View>
      <View style={{ position: 'absolute', top: height / 2 - 1.5, left: 2, right: 2, height: 3, borderRadius: 1.5, backgroundColor: line }} />
      <View style={{ gap: 3, alignItems: 'center' }}>
        {Array.from({ length: grooves }, (_, i) => (
          <View key={i} style={{ width: width - 12, height: 1, backgroundColor: color.scrim, opacity: 0.55 }} />
        ))}
      </View>
    </View>
  );
}
