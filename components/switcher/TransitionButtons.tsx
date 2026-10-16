import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle } from 'react-native-svg';
import type { DeviceProfile } from '@/core/profiles/types';
import { CMD_AUTO, CMD_CUT } from '@/core/codec/simpleCommands';
import { controller } from '@/core/controller/DeviceController';
import { faderAuto, faderCut } from '@/lib/faderTransition';
import type { FeatureRoute } from '@/lib/features';
import { haptic } from '@/lib/haptics';
import { useTransTime } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

const BIG_H = 118;

/**
 * CUT：route='sysex' は押している間だけ ON（touchDown で 01、touchUp/Cancel で 00。SPEC §9-2）。
 * route='text' は簡易制御コマンド `CUT;` をタップで送る（V-80HD / VR-120HD の LAN）。
 * route='fader' は Fader Level に最大値を 1 回書く（V-80HD / VR-120HD の USB/BLE 等。lib/faderTransition.ts）
 */
type Route = Exclude<FeatureRoute, null>;

export function CutButton({ profile, route = 'sysex' }: { profile: DeviceProfile; route?: Route }) {
  const a = profile.addrs.cut;
  const [down, setDown] = useState(false);
  if (route === 'sysex' && a == null) return null;
  return (
    <Pressable
      onPressIn={() => {
        setDown(true);
        haptic.impact();
        if (route === 'text') controller.sendText(CMD_CUT);
        else if (route === 'fader') faderCut(profile);
        else if (a != null) controller.press(a, profile.addrs.cutValues);
      }}
      onPressOut={() => {
        setDown(false);
        if (route === 'sysex' && a != null) controller.release(a);
      }}
      accessibilityRole="button"
      accessibilityLabel="カット"
      accessibilityHint={route !== 'sysex' ? 'CUT で切り替えます' : '押している間、CUT スイッチを押下します'}
    >
      <View
        style={{
          height: BIG_H,
          borderRadius: radius.big,
          backgroundColor: down ? color.fill2 : color.fill,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: down ? 0.98 : 1 }],
        }}
      >
        <AppText size={30} weight="800" style={{ letterSpacing: 2 }} maxFontSizeMultiplier={1.1}>
          CUT
        </AppText>
        <AppText variant="caption2" tone="label2" className="mt-1.5" maxFontSizeMultiplier={1.2}>
          {route !== 'sysex' ? 'タップで切替' : '押している間 ON'}
        </AppText>
      </View>
    </Pressable>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_R = 10;
const RING_LEN = 2 * Math.PI * RING_R;

/** AUTO：タップで AUTO SW（01 → 150ms 後 00）。route='fader' は TIME かけて Fader Level を 0→最大。遷移中は TIME から算出したリング進捗 */
export function AutoButton({ profile, route = 'sysex' }: { profile: DeviceProfile; route?: Route }) {
  const a = profile.addrs.auto;
  const time = useTransTime(profile);
  const progress = useSharedValue(0);
  const [running, setRunning] = useState(false);

  useEffect(() => () => cancelAnimation(progress), [progress]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - progress.value) }));

  if (route === 'sysex' && a == null) return null;

  const start = () => {
    haptic.impact();
    if (route === 'text') controller.sendText(CMD_AUTO);
    else if (route === 'fader') faderAuto(profile, time ?? 1);
    else if (a != null) controller.tap(a, profile.addrs.autoValues);
    const ms = Math.max(100, (time ?? 1) * 1000);
    cancelAnimation(progress);
    progress.value = 0;
    setRunning(true);
    progress.value = withTiming(1, { duration: ms, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(setRunning, false);
    });
  };

  return (
    <Pressable
      onPress={start}
      accessibilityRole="button"
      accessibilityLabel="オート"
      accessibilityHint={time == null ? 'AUTO スイッチを押します' : `${time.toFixed(1)}秒でトランジションします`}
      accessibilityState={{ busy: running }}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View style={{ height: BIG_H, borderRadius: radius.big, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 12, right: 16 }} pointerEvents="none">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={RING_R} stroke={color.onTint} strokeOpacity={0.35} strokeWidth={3} fill="none" />
            {running ? (
              <AnimatedCircle
                cx={12}
                cy={12}
                r={RING_R}
                stroke={color.onTint}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_LEN} ${RING_LEN}`}
                animatedProps={ringProps}
                transform="rotate(-90 12 12)"
              />
            ) : null}
          </Svg>
        </View>
        <AppText size={30} weight="800" tone="onTint" style={{ letterSpacing: 2 }} maxFontSizeMultiplier={1.1}>
          AUTO
        </AppText>
        <AppText variant="caption2" weight="600" tone="onTint" mono className="mt-1.5" style={{ opacity: 0.75 }} maxFontSizeMultiplier={1.2}>
          {time == null ? '—' : `${time.toFixed(1)}s`}
        </AppText>
      </View>
    </Pressable>
  );
}

/** CUT/AUTO の経路が無い機種・接続（featureRoute が null）：Tバーでの代替を案内（SPEC §9-5） */
export function CutAutoUnavailable() {
  return (
    <View style={{ height: BIG_H * 2 + 10, borderRadius: radius.big, backgroundColor: color.group, padding: 16, justifyContent: 'center' }}>
      <AppText variant="headline" className="mb-2">
        CUT / AUTO
      </AppText>
      <AppText variant="footnote" tone="label2">
        この機種では CUT / AUTO の遠隔操作を確認中のため、ボタンを表示していません。右の Tバーで切り替えてください。
      </AppText>
    </View>
  );
}
