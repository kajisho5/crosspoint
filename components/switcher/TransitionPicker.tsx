import { useEffect, useRef } from 'react';
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
  // 長押しの連続変更で、本体からの読み返しを待たずに次の値を出すため最新値を保持
  const timeRef = useRef(time ?? 0);
  if (time != null) timeRef.current = time;

  const setTime = (next: number) => {
    const v = Math.min(TIME_MAX, Math.max(TIME_MIN, Math.round(next * 10) / 10));
    if (v === timeRef.current) return;
    timeRef.current = v;
    haptic.select();
    controller.write(profile.addrs.transTime, encodeTime(v));
  };

  const canDown = time != null && time > TIME_MIN;
  const canUp = time != null && time < TIME_MAX;

  return (
    <View className="px-4" style={{ gap: 8 }}>
      {profile.addrs.transType != null ? (
        <Segmented
          values={[...profile.transTypes]}
          index={type ?? 0}
          onChange={(i) => {
            haptic.select();
            if (profile.addrs.transType != null) controller.write(profile.addrs.transType, [i]);
          }}
          style={{ height: 34 }}
          accessibilityLabel="トランジションの種類"
        />
      ) : null}
      <View className="flex-row items-center" style={{ height: ROW_H, borderRadius: 12, backgroundColor: color.group, paddingHorizontal: 4, gap: 4 }}>
        <StepButton label="−" a11y="短くする" disabled={!canDown} onStep={() => time != null && setTime(timeRef.current - TIME_STEP)} />
        <View className="flex-1 flex-row items-baseline justify-center" style={{ gap: 8 }}>
          <AppText variant="caption" tone="label2" weight="600" style={{ letterSpacing: 0.6 }} maxFontSizeMultiplier={1.2}>
            TIME
          </AppText>
          <AppText
            size={20}
            weight="600"
            mono
            maxFontSizeMultiplier={1.2}
            accessibilityLabel={time == null ? 'トランジション時間 不明' : `トランジション時間 ${time.toFixed(1)}秒`}
          >
            {time == null ? '—' : `${time.toFixed(1)}s`}
          </AppText>
        </View>
        <StepButton label="+" a11y="長くする" disabled={!canUp} onStep={() => time != null && setTime(timeRef.current + TIME_STEP)} />
      </View>
    </View>
  );
}

const ROW_H = 52;
/** 長押しで連続変更：最初の繰り返しまで / 以降の間隔 */
const REPEAT_DELAY_MS = 400;
const REPEAT_MS = 90;

/** − / +：44pt 以上の押しやすいボタン。長押しで連続して変わる */
function StepButton({ label, a11y, disabled, onStep }: { label: string; a11y: string; disabled: boolean; onStep: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  const stop = () => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const repeat = () => {
    stepRef.current();
    timer.current = setTimeout(repeat, REPEAT_MS);
  };
  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        stepRef.current();
        timer.current = setTimeout(repeat, REPEAT_DELAY_MS);
      }}
      onPressOut={stop}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`トランジション時間を${a11y}`}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 64,
        height: MIN_TAP,
        borderRadius: 10,
        backgroundColor: pressed ? color.fill2 : color.fill,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      })}
    >
      <AppText size={26} weight="600" tone="accent" maxFontSizeMultiplier={1}>
        {label}
      </AppText>
    </Pressable>
  );
}
