import { useEffect, useRef, useState } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { DeviceProfile } from '@/core/profiles/types';
import { encodeU14 } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useFader, useFaderBaseUpper } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

/** V-160HD 系の既定（プロファイルの faderMax を優先） */
export const FADER_MAX = 2047;
const TRACK_H = 190;
const TRACK_W = 14;
const KNOB_W = 74;
const KNOB_H = 28;
/** 送信間引き（CommandQueue の coalesce は M2） */
const SEND_INTERVAL_MS = 33;

/**
 * Tバー（AB Fader 0–2047）。上下ドラッグ、端でハプティクス、指を離しても値を保持（SPEC §11 S1）。
 * 上端 = B（2047）、下端 = A（0）。
 * Fader Base を持つ機種（V-80HD / VR-120HD）は Level = 遷移の進み量なので、Base が Upper の間は
 * 表示位置 = max − Level、書く Level = max − 位置（物理レバーと同じ動き。完了で Base が反転しても位置は端のまま）。
 */
export function TBar({ profile, height }: { profile: DeviceProfile; height: number }) {
  const level = useFader(profile);
  const max = profile.faderMax;
  const upper = useFaderBaseUpper(profile);
  const value = level == null ? null : upper ? max - level : level;
  const pos = useSharedValue(value ?? 0);
  const start = useSharedValue(0);
  const dragging = useSharedValue(false);
  const [shown, setShown] = useState(value ?? 0);
  const lastSent = useRef(0);
  const lastEdge = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    if (value != null && !dragging.value) {
      pos.value = value;
      setShown(value);
    }
  }, [value, pos, dragging]);

  const send = (v: number, force: boolean) => {
    setShown(v);
    const edge = v >= max ? 'top' : v <= 0 ? 'bottom' : null;
    if (edge && edge !== lastEdge.current) haptic.heavy();
    lastEdge.current = edge;
    const now = Date.now();
    if (!force && now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    if (profile.addrs.fader != null) controller.write(profile.addrs.fader, encodeU14(upper ? max - v : v));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      dragging.value = true;
      start.value = pos.value;
    })
    .onUpdate((e) => {
      const v = Math.round(Math.min(max, Math.max(0, start.value - (e.translationY / TRACK_H) * max)));
      if (v !== pos.value) {
        pos.value = v;
        scheduleOnRN(send, v, false);
      }
    })
    .onFinalize(() => {
      dragging.value = false;
      scheduleOnRN(send, Math.round(pos.value), true);
    });

  const fillStyle = useAnimatedStyle(() => ({ height: (pos.value / max) * TRACK_H }));
  const knobStyle = useAnimatedStyle(() => ({ top: 40 + TRACK_H * (1 - pos.value / max) - KNOB_H / 2 }));

  const pct = Math.round((shown / max) * 100);
  const step = (dir: 1 | -1) => {
    const v = Math.min(max, Math.max(0, shown + dir * Math.round(max / 10)));
    pos.value = v;
    send(v, true);
  };
  const onA11y = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') step(1);
    if (e.nativeEvent.actionName === 'decrement') step(-1);
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Tバー"
        accessibilityValue={{ min: 0, max: 100, now: value == null ? undefined : pct, text: value == null ? '不明' : `${pct}%` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onA11y}
        style={{ height, borderRadius: radius.big, backgroundColor: color.group }}
      >
        <AppText variant="caption" tone="label2" weight="600" style={{ position: 'absolute', top: 12, left: 14, letterSpacing: 0.6 }} maxFontSizeMultiplier={1.2}>
          T-BAR
        </AppText>
        <AppText variant="subhead" weight="600" mono style={{ position: 'absolute', top: 10, right: 14 }} maxFontSizeMultiplier={1.2}>
          {value == null ? '—' : `${pct}%`}
        </AppText>
        <AppText variant="footnote" weight="700" tone="label2" mono style={{ position: 'absolute', top: 40, right: 14 }} maxFontSizeMultiplier={1}>
          B
        </AppText>
        <AppText variant="footnote" weight="700" tone="label2" mono style={{ position: 'absolute', top: 40 + TRACK_H - 16, right: 14 }} maxFontSizeMultiplier={1}>
          A
        </AppText>

        <View style={{ position: 'absolute', top: 40, left: 58, width: TRACK_W, height: TRACK_H, borderRadius: TRACK_W / 2, backgroundColor: color.fill2, overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: color.accent }, fillStyle]} />
        </View>
        {Array.from({ length: 11 }, (_, i) => (
          <View
            key={i}
            style={{ position: 'absolute', top: 40 + i * (TRACK_H / 10), left: 58 + 26, width: i % 5 === 0 ? 14 : 8, height: 1, backgroundColor: color.label3 }}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 58 + TRACK_W / 2 - KNOB_W / 2,
              width: KNOB_W,
              height: KNOB_H,
              borderRadius: 8,
              backgroundColor: color.knob,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: color.scrim,
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            },
            knobStyle,
          ]}
        >
          <View style={{ width: 50, height: 2, borderRadius: 1, backgroundColor: color.gray }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
