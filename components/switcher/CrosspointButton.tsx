import { memo } from 'react';
import { Pressable, View } from 'react-native';
import type { TallyState } from '@/core/profiles/types';
import { color, radius, xp } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

export type Bus = 'pgm' | 'pst';

export interface CrosspointButtonProps {
  n: number;
  label: string;
  bus: Bus;
  selected: boolean;
  /** 全体タリー（他バスで選ばれていれば 2pt 枠） */
  tally: TallyState;
  onPress: (n: number) => void;
  /** 長押し：INPUT の設定シート（F12） */
  onLongPress?: (n: number) => void;
}

const BUS_NAME: Record<Bus, string> = { pgm: 'プログラム', pst: 'プリセット' };

/** クロスポイント（ボード 66×58pt・r12）。選択＝塗り、他バスのタリー＝2pt 枠 */
export const CrosspointButton = memo(function CrosspointButton({ n, label, bus, selected, tally, onPress, onLongPress }: CrosspointButtonProps) {
  const other: Bus = bus === 'pgm' ? 'pst' : 'pgm';
  const otherOn = tally === other || tally === 'both';
  const fill = selected ? color[bus] : color.fill;
  const states = [selected ? '選択中' : null, otherOn ? (other === 'pgm' ? 'オンエア中' : 'プリセット中') : null].filter(Boolean).join('、');

  return (
    <Pressable
      onPress={() => onPress(n)}
      onLongPress={onLongPress ? () => onLongPress(n) : undefined}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityHint={onLongPress ? '長押しで割当とラベルを設定' : undefined}
      accessibilityLabel={`${BUS_NAME[bus]} ${n}、${label}${states ? `、${states}` : ''}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ height: xp.height, borderRadius: radius.xp, backgroundColor: fill, justifyContent: 'center', alignItems: 'center' }}>
        {otherOn && !selected ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: radius.xp - 1, borderWidth: 2, borderColor: color[other] }}
          />
        ) : null}
        <AppText
          variant="caption2"
          weight="600"
          mono
          tone={selected ? 'onTint' : 'label2'}
          style={{ position: 'absolute', top: 5, left: 8, opacity: selected ? 0.85 : 1 }}
          maxFontSizeMultiplier={1.1}
        >
          {n}
        </AppText>
        <AppText
          variant="footnote"
          weight="600"
          tone={selected ? 'onTint' : 'label'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.3}
          style={{ marginTop: 8, paddingHorizontal: 4 }}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
});
