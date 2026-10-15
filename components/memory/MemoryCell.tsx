import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Rect } from 'react-native-svg';
import { haptic } from '@/lib/haptics';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

/** 長押し確定時間（SPEC §11 S4） */
export const HOLD_MS = 600;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface MemoryCellProps {
  n: number;
  name: string | null;
  current: boolean;
  size: number;
  noun: string;
  onHoldChange: (n: number | null) => void;
  onCommit: (n: number) => void;
}

/** メモリー 1 枠（ボード 66×66・r12）。0.6s 長押しで呼出し、途中で離すとキャンセル */
export const MemoryCell = memo(function MemoryCell({ n, name, current, size, noun, onHoldChange, onCommit }: MemoryCellProps) {
  const progress = useSharedValue(0);
  const [holding, setHolding] = useState(false);
  const inset = 1.5;
  const w = size - inset * 2;
  const r = radius.xp - inset;
  const perimeter = 2 * (w - 2 * r) + 2 * (w - 2 * r) + 2 * Math.PI * r;

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: perimeter * (1 - progress.value) }));

  const finish = () => {
    setHolding(false);
    onHoldChange(null);
    haptic.success();
    onCommit(n);
  };

  const begin = () => {
    haptic.select();
    setHolding(true);
    onHoldChange(n);
    progress.value = 0;
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (done) => {
      if (done) {
        progress.value = 0;
        scheduleOnRN(finish);
      }
    });
  };

  const cancel = () => {
    if (!holding) return;
    cancelAnimation(progress);
    progress.value = 0;
    setHolding(false);
    onHoldChange(null);
  };

  const label = name == null ? '' : name.length > 0 ? name : '—';
  const num = String(n).padStart(2, '0');

  return (
    <Pressable
      onPressIn={begin}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel={`${noun} ${n}${name ? `、${name}` : ''}${current ? '、現在' : ''}`}
      accessibilityHint="長押しで呼び出します"
      accessibilityActions={[{ name: 'activate', label: '呼び出す' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate') onCommit(n);
      }}
      accessibilityState={{ selected: current }}
    >
      <View style={{ width: size, height: size, borderRadius: radius.xp, backgroundColor: current ? color.accent : color.fill, alignItems: 'center', justifyContent: 'center' }}>
        <AppText size={20} weight="700" mono tone={current ? 'onTint' : 'label'} maxFontSizeMultiplier={1.1}>
          {num}
        </AppText>
        <AppText
          size={9}
          weight="600"
          tone={current ? 'onTint' : name ? 'label2' : 'label3'}
          numberOfLines={1}
          style={{ letterSpacing: 0.6, marginTop: 2, paddingHorizontal: 3 }}
          maxFontSizeMultiplier={1.1}
        >
          {label}
        </AppText>
        {holding ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
            <Svg width={size} height={size}>
              <Rect x={inset} y={inset} width={w} height={w} rx={r} ry={r} stroke={color.warn} strokeWidth={3} fill="none" />
              <AnimatedRect
                x={inset}
                y={inset}
                width={w}
                height={w}
                rx={r}
                ry={r}
                stroke={color.onTint}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${perimeter} ${perimeter}`}
                animatedProps={ringProps}
              />
            </Svg>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});
