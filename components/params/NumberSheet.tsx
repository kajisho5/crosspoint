import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

/**
 * 数値の編集シート：スライダー＋ステッパー。
 * 値は「表示値」（例 -50.0〜50.0%、0.0〜4.0sec、-80.0〜10.0dB）。送信はシート側では行わず onChange で親に渡す（親が optimistic write）。
 */
export function NumberSheet({
  title,
  visible,
  value,
  min,
  max,
  step,
  format,
  /** 「OFF」「−INF」などの特殊値（スライダー外）。ある場合はボタンを出す */
  special,
  isSpecial,
  onChange,
  onSpecial,
  onClose,
}: {
  title: string;
  visible: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  special?: string;
  isSpecial?: boolean;
  onChange: (v: number) => void;
  onSpecial?: () => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (visible) setLocal(value);
  }, [visible, value]);

  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const snap = (v: number) => Number((Math.round(v / step) * step).toFixed(decimals));
  const commit = (v: number) => {
    const s = Math.min(max, Math.max(min, snap(v)));
    setLocal(s);
    onChange(s);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <View className="flex-row items-center justify-between px-4" style={{ height: 56 }}>
          <View style={{ width: 48 }} />
          <AppText variant="headline" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {title}
          </AppText>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <AppText variant="body" weight="600" tone="accent">
              完了
            </AppText>
          </Pressable>
        </View>
        <View className="px-4" style={{ gap: 20 }}>
          <View className="items-center" style={{ paddingVertical: 12 }}>
            <AppText variant="largeTitle" mono weight="600" accessibilityLiveRegion="polite">
              {isSpecial && special ? special : format(local)}
            </AppText>
          </View>
          <Slider
            value={local}
            minimumValue={min}
            maximumValue={max}
            step={step}
            onValueChange={(v) => setLocal(snap(v))}
            onSlidingComplete={commit}
            accessibilityLabel={title}
          />
          <View className="flex-row" style={{ gap: 12 }}>
            <StepButton label="−" onPress={() => commit(local - step)} />
            <StepButton label="+" onPress={() => commit(local + step)} />
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <StepButton label="最小" small onPress={() => commit(min)} />
            <StepButton label="0" small onPress={() => commit(Math.min(max, Math.max(min, 0)))} />
            <StepButton label="最大" small onPress={() => commit(max)} />
            {special && onSpecial ? <StepButton label={special} small tone={isSpecial ? 'accent' : undefined} onPress={onSpecial} /> : null}
          </View>
          <AppText variant="footnote" tone="label2" align="center">
            {format(min)} 〜 {format(max)}　刻み {format(step)}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

function StepButton({ label, onPress, small, tone }: { label: string; onPress: () => void; small?: boolean; tone?: 'accent' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
      <View className="items-center justify-center" style={{ height: small ? 44 : 56, borderRadius: radius.card, backgroundColor: tone === 'accent' ? color.accent : color.fill }}>
        <AppText variant={small ? 'body' : 'title'} weight="600" tone={tone === 'accent' ? 'onTint' : 'label'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
