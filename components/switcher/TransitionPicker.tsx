import { Pressable, View } from 'react-native';
import type { DeviceProfile } from '@/core/profiles/types';
import { encodeTime } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useTransTime, useTransType } from '@/stores/selectors';
import { color, MIN_TAP } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { Segmented } from '../ui/Segmented';

export const TIME_MIN = 0;
export const TIME_MAX = 4;
export const TIME_STEP = 0.1;

/** MIX/WIPE と MIX/WIPE TIME（0.1s 刻み 0.0–4.0、SPEC §11 S1） */
export function TransitionPicker({ profile }: { profile: DeviceProfile }) {
  const type = useTransType(profile);
  const time = useTransTime(profile);

  const setTime = (next: number) => {
    const v = Math.min(TIME_MAX, Math.max(TIME_MIN, Math.round(next * 10) / 10));
    if (time != null && v === time) return;
    haptic.select();
    controller.write(profile.addrs.transTime, encodeTime(v));
  };

  return (
    <View className="flex-row px-4" style={{ gap: 10 }}>
      {profile.addrs.transType != null ? (
        <Segmented
          values={[...profile.transTypes]}
          index={type ?? 0}
          onChange={(i) => {
            haptic.select();
            if (profile.addrs.transType != null) controller.write(profile.addrs.transType, [i]);
          }}
          style={{ flex: 1, height: 34 }}
          accessibilityLabel="トランジションの種類"
        />
      ) : null}
      <View className="flex-row items-center" style={{ flex: 0.95, height: 34, borderRadius: 9, backgroundColor: color.group, paddingLeft: 12 }}>
        <AppText variant="caption" tone="label2" weight="600" style={{ letterSpacing: 0.6 }} maxFontSizeMultiplier={1.2}>
          TIME
        </AppText>
        <AppText
          variant="callout"
          mono
          align="center"
          className="flex-1"
          maxFontSizeMultiplier={1.2}
          accessibilityLabel={time == null ? 'トランジション時間 不明' : `トランジション時間 ${time.toFixed(1)}秒`}
        >
          {time == null ? '—' : `${time.toFixed(1)}s`}
        </AppText>
        <View style={{ width: 0.5, height: 18, backgroundColor: color.sep }} />
        <StepButton label="−" a11y="短くする" disabled={time == null || time <= TIME_MIN} onPress={() => time != null && setTime(time - TIME_STEP)} />
        <StepButton label="+" a11y="長くする" disabled={time == null || time >= TIME_MAX} onPress={() => time != null && setTime(time + TIME_STEP)} />
      </View>
    </View>
  );
}

function StepButton({ label, a11y, disabled, onPress }: { label: string; a11y: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`トランジション時間を${a11y}`}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => ({ width: 36, height: MIN_TAP - 10, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : pressed ? 0.5 : 1 })}
    >
      <AppText size={20} weight="500" tone="accent" maxFontSizeMultiplier={1}>
        {label}
      </AppText>
    </Pressable>
  );
}
