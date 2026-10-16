import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { dbToU7, encodeLevel, formatDb, type Addr } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import type { ChannelState } from '@/stores/selectors';
import { color } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { dbToPos, posToDb, ZERO_DB_POS } from './levelScale';

export const STRIP_W = 66;
export const STRIP_H = 520;
const TRACK_TOP = 70;
const TRACK_H = 340;
const KNOB_H = 32;
const SEND_INTERVAL_MS = 33;

export interface ChannelStripProps {
  name: string;
  state: ChannelState;
  levelAddr: Addr;
  /** ミュートが無い機種は null（ボタンを無効にする） */
  muteAddr: Addr | null;
  /** レベルの符号化（profile.audioLevelCodec） */
  codec?: 'db3' | 'u7';
  master?: boolean;
  width?: number;
}

/** 縦フェーダー＋dB 表示＋MUTE（ボード S3、66×520）。ダブルタップで 0.0dB */
export function ChannelStrip({ name, state, levelAddr, muteAddr, codec = 'db3', master = false, width = STRIP_W }: ChannelStripProps) {
  const pos = useSharedValue(state.db === undefined ? 1 : dbToPos(state.db));
  const start = useSharedValue(0);
  const dragging = useSharedValue(false);
  const [shownDb, setShownDb] = useState<number | null | undefined>(state.db);
  const lastSent = useRef(0);

  useEffect(() => {
    if (state.db !== undefined && !dragging.value) {
      pos.value = dbToPos(state.db);
      setShownDb(state.db);
    }
  }, [state.db, pos, dragging]);

  const send = (db: number | null, force: boolean) => {
    setShownDb(db);
    const now = Date.now();
    if (!force && now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    controller.write(levelAddr, codec === 'db3' ? encodeLevel(db) : [dbToU7(db)]);
  };

  const setDb = (db: number | null) => {
    pos.value = dbToPos(db);
    send(db, true);
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-3, 3])
    .failOffsetX([-14, 14])
    .onBegin(() => {
      start.value = pos.value;
    })
    .onStart(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      const p = Math.min(1, Math.max(0, start.value + e.translationY / TRACK_H));
      pos.value = p;
      scheduleOnRN(send, posToDb(p), false);
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      scheduleOnRN(send, posToDb(pos.value), true);
    });

  const resetZero = () => {
    haptic.select();
    setDb(0);
  };
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scheduleOnRN(resetZero);
    });

  const gesture = Gesture.Exclusive(pan, doubleTap);

  const fillStyle = useAnimatedStyle(() => ({ top: TRACK_H * pos.value }));
  const knobStyle = useAnimatedStyle(() => ({ top: TRACK_TOP + TRACK_H * pos.value - KNOB_H / 2 }));

  const muted = state.mute === true;
  const dbText = shownDb === undefined ? '—' : formatDb(shownDb);

  const onA11y = (e: AccessibilityActionEvent) => {
    const cur = shownDb === undefined || shownDb === null ? -80 : shownDb;
    if (e.nativeEvent.actionName === 'increment') setDb(Math.min(10, cur + 1));
    if (e.nativeEvent.actionName === 'decrement') setDb(cur - 1 < -80 ? null : cur - 1);
    if (e.nativeEvent.actionName === 'activate') resetZero();
  };

  return (
    <View style={{ width, height: STRIP_H, borderRadius: 14, backgroundColor: color.group, overflow: 'hidden' }}>
      {master ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.accent, opacity: 0.14 }} /> : null}
      <AppText variant="caption" weight="700" align="center" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 14, letterSpacing: 0.4, paddingHorizontal: 4 }} maxFontSizeMultiplier={1.1}>
        {name}
      </AppText>
      <AppText variant="footnote" weight="600" mono align="center" tone={muted ? 'pgm' : 'label2'} className="mt-1" maxFontSizeMultiplier={1.1}>
        {dbText}
      </AppText>

      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${name} レベル`}
          accessibilityValue={{ text: muted ? `${dbText}、ミュート中` : dbText }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: '0.0dB に戻す' }]}
          onAccessibilityAction={onA11y}
          style={{ position: 'absolute', top: TRACK_TOP - KNOB_H / 2, left: 0, right: 0, height: TRACK_H + KNOB_H }}
        />
      </GestureDetector>

      <View pointerEvents="none" style={{ position: 'absolute', top: TRACK_TOP, left: width / 2 - 3, width: 6, height: TRACK_H, borderRadius: 3, backgroundColor: color.fill2, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: muted ? color.gray : color.accent }, fillStyle]} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: TRACK_TOP + TRACK_H * ZERO_DB_POS, left: 8, width: 8, height: 1, backgroundColor: color.label3 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: TRACK_TOP + TRACK_H * ZERO_DB_POS, right: 8, width: 8, height: 1, backgroundColor: color.label3 }} />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 9,
            right: 9,
            height: KNOB_H,
            borderRadius: 7,
            backgroundColor: color.knob,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: color.scrim,
            shadowOpacity: 0.3,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
          },
          knobStyle,
        ]}
      >
        <View style={{ width: width - 30, height: 2, borderRadius: 1, backgroundColor: color.gray }} />
      </Animated.View>

      <Pressable
        onPress={() => {
          if (state.mute == null || muteAddr == null) return;
          haptic.select();
          controller.write(muteAddr, [muted ? 0 : 1]);
        }}
        disabled={state.mute == null}
        accessibilityRole="switch"
        accessibilityLabel={`${name} ミュート`}
        accessibilityState={{ checked: muted, disabled: state.mute == null }}
        style={({ pressed }) => ({ position: 'absolute', left: 8, right: 8, bottom: 14, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: muted ? color.pgm : color.fill2 }}>
          <AppText variant="caption" weight={muted ? '800' : '700'} tone={muted ? 'onTint' : 'label2'} maxFontSizeMultiplier={1.1}>
            MUTE
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
