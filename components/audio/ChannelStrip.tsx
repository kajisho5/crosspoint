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
import { dbToPos, posToDb, snapZero, ZERO_DB_POS } from './levelScale';
import { FaderCap } from '../ui/FaderCap';

export const STRIP_W = 66;
export const STRIP_H = 520;
const TRACK_TOP = 70;
const TRACK_H = 340;
const KNOB_H = 44;
/** 目盛り（dB。null = −INF） */
const SCALE: readonly (number | null)[] = [10, 5, 0, -5, -10, -20, -40, null];
const SEND_INTERVAL_MS = 33;
/** 0dB の吸い付き幅（指の移動量、片側） */
const DETENT_PX = 9;

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
  const inDetent = useSharedValue(false);
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
      inDetent.value = Math.abs(pos.value - ZERO_DB_POS) < 1e-6;
    })
    .onStart(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      const raw = Math.min(1, Math.max(0, start.value + e.translationY / TRACK_H));
      // 0dB に吸い付く（±DETENT_PX の範囲は 0.0dB。入った瞬間に軽いハプティクス）
      const p = snapZero(raw, DETENT_PX / TRACK_H);
      const snapped = p === ZERO_DB_POS;
      if (snapped && !inDetent.value) scheduleOnRN(haptic.select);
      inDetent.value = snapped;
      if (p === pos.value) return;
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
  // 目盛り文字の分だけフェーダーを右に寄せる
  const trackX = Math.round(width * 0.6);
  const capW = Math.min(40, (width - trackX) * 2 - 6);
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

      {SCALE.map((db) => {
        const y = TRACK_TOP + TRACK_H * dbToPos(db);
        const zero = db === 0;
        return (
          <View key={db ?? 'inf'} pointerEvents="none" style={{ position: 'absolute', top: y - 7, left: 0, width: trackX - 4, height: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <AppText size={9} weight={zero ? '800' : '600'} mono tone={zero ? 'label' : 'label3'} maxFontSizeMultiplier={1}>
              {db === null ? '-∞' : db > 0 ? `+${db}` : `${db}`}
            </AppText>
            <View style={{ width: zero ? 7 : 4, height: zero ? 2 : 1, marginLeft: 2, backgroundColor: zero ? color.label : color.label3 }} />
          </View>
        );
      })}
      <View pointerEvents="none" style={{ position: 'absolute', top: TRACK_TOP, left: trackX - 2, width: 4, height: TRACK_H, borderRadius: 2, backgroundColor: color.scrim, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: muted ? color.gray : color.accent }, fillStyle]} />
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: trackX - capW / 2, width: capW, height: KNOB_H }, knobStyle]}>
        <FaderCap width={capW} height={KNOB_H} accent={master ? 'accent' : muted ? 'gray' : 'label'} />
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
