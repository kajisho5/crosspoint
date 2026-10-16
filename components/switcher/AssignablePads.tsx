import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Addr } from '@/core/codec/value';
import type { DeviceProfile } from '@/core/profiles/types';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { color, radius, xp } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { INSET_PAGE, useColumnWidth } from '../ui/useColumnWidth';

const COLUMNS = 4;
const PAD_H = 56;

/**
 * ASSIGNABLE PAD（V-80HD）：本体パネルのパッドと同じく押している間 ON（01 → 00）。
 * 何が割り当てられているかは公開アドレスが無く読めないため、番号だけ表示する。
 */
export function AssignablePads({ profile }: { profile: DeviceProfile }) {
  const pads = profile.addrs.pads;
  const w = useColumnWidth(COLUMNS, INSET_PAGE, xp.gap);
  if (!pads || pads.length === 0) return null;
  return (
    <View className="mt-5 px-4">
      <AppText variant="section" tone="label2" accessibilityRole="header" style={{ marginBottom: 8 }}>
        ASSIGNABLE PADS
      </AppText>
      <View className="flex-row flex-wrap" style={{ gap: xp.gap }}>
        {pads.map((a, i) => (
          <Pad key={a} a={a} n={i + 1} width={w} />
        ))}
      </View>
    </View>
  );
}

function Pad({ a, n, width }: { a: Addr; n: number; width: number }) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPressIn={() => {
        setDown(true);
        haptic.impact();
        controller.press(a);
      }}
      onPressOut={() => {
        setDown(false);
        controller.release(a);
      }}
      accessibilityRole="button"
      accessibilityLabel={`アサイナブルパッド ${n}`}
      accessibilityHint="押している間、本体の PAD を押下します"
    >
      <View
        style={{
          width,
          height: PAD_H,
          borderRadius: radius.card,
          backgroundColor: down ? color.accent : color.fill,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: down ? 0.97 : 1 }],
        }}
      >
        <AppText variant="headline" weight="700" mono tone={down ? 'onTint' : 'label'} maxFontSizeMultiplier={1.2}>
          {`PAD ${n}`}
        </AppText>
      </View>
    </Pressable>
  );
}
