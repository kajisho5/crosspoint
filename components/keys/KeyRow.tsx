import { Pressable, View } from 'react-native';
import { color } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

/** PGM / PVW / ON のトグル（ボード 64×34・r17）。状態は受信値で確定（SPEC §11 S2） */
export function TogglePill({
  label,
  on,
  tone,
  a11yName,
  onPress,
}: {
  label: string;
  on: boolean | null;
  tone: 'pgm' | 'pst';
  a11yName: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={on == null}
      accessibilityRole="switch"
      accessibilityLabel={`${a11yName} ${label}`}
      accessibilityState={{ checked: on ?? undefined, disabled: on == null }}
      hitSlop={{ top: 5, bottom: 5, left: 2, right: 2 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 64,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? color[tone] : color.fill2,
        }}
      >
        <AppText variant="footnote" weight={on ? '700' : '600'} tone={on ? 'onTint' : 'label2'} maxFontSizeMultiplier={1.2}>
          {on == null ? '—' : label}
        </AppText>
      </View>
    </Pressable>
  );
}

/** キー 1 行（名前・サブ表示・右にトグル） */
export function KeyRow({ name, sub, children }: { name: string; sub: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center px-4" style={{ minHeight: 60 }}>
      <View className="flex-1 py-2 pr-2">
        <AppText variant="callout">{name}</AppText>
        <AppText variant="caption" weight="400" tone="label2" mono className="mt-0.5" numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      <View className="flex-row" style={{ gap: 8 }}>
        {children}
      </View>
    </View>
  );
}
