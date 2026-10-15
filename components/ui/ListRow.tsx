import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { color, MIN_TAP } from '@/theme/tokens';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  subtitleMono?: boolean;
  value?: string;
  valueMono?: boolean;
  icon?: SFSymbol;
  iconTint?: 'accent' | 'gray' | 'pgm' | 'warn';
  right?: ReactNode;
  chevron?: boolean;
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
}

/** 設定・一覧の 1 行（最小 44pt） */
export function ListRow({
  title,
  subtitle,
  subtitleMono,
  value,
  valueMono,
  icon,
  iconTint = 'accent',
  right,
  chevron,
  checked,
  destructive,
  disabled,
  onPress,
  onLongPress,
  accessibilityHint,
}: ListRowProps) {
  const body = (
    <View className="flex-row items-center px-4" style={{ minHeight: subtitle ? 60 : MIN_TAP, opacity: disabled ? 0.4 : 1 }}>
      {icon ? (
        <View className="mr-3 items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color[iconTint] }}>
          <SymbolView name={icon} size={18} tintColor={color.onTint} />
        </View>
      ) : null}
      <View className="flex-1 py-2.5">
        <AppText variant="body" tone={destructive ? 'pgm' : 'label'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="label2" mono={subtitleMono} className="mt-0.5">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="body" tone="label2" mono={valueMono} className="ml-2">
          {value}
        </AppText>
      ) : null}
      {right}
      {checked ? <SymbolView name="checkmark" size={17} weight="semibold" tintColor={color.accent} style={{ marginLeft: 8 }} /> : null}
      {chevron ? <SymbolView name="chevron.right" size={14} weight="semibold" tintColor={color.label3} style={{ marginLeft: 8 }} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join('、')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, selected: !!checked }}
      style={({ pressed }) => ({ backgroundColor: pressed ? color.fill2 : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}
