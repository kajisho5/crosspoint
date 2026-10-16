import { useEffect, useState } from 'react';
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
 * 「バンク選択」は本体の [SETUP (+PAD) BANK SELECT]：タップで押したままにし（ラッチ）、次に押した PAD でバンクを選ぶと離す。
 * もう一度タップすると何もせず離す。割り当て内容は公開アドレスが無く読めないため、番号だけ表示する。
 */
export function AssignablePads({ profile }: { profile: DeviceProfile }) {
  const pads = profile.addrs.pads;
  const bankAddr = profile.addrs.padBankSelect;
  const w = useColumnWidth(COLUMNS, INSET_PAGE, xp.gap);
  const [bankHeld, setBankHeld] = useState(false);

  // 画面を離れるときに押したままを残さない
  useEffect(
    () => () => {
      if (bankAddr != null) controller.release(bankAddr);
    },
    [bankAddr],
  );

  if (!pads || pads.length === 0) return null;

  const toggleBank = () => {
    if (bankAddr == null) return;
    haptic.select();
    if (bankHeld) {
      controller.release(bankAddr);
      setBankHeld(false);
    } else {
      controller.press(bankAddr);
      setBankHeld(true);
    }
  };

  const onPadUp = () => {
    if (bankHeld && bankAddr != null) {
      controller.release(bankAddr);
      setBankHeld(false);
    }
  };

  return (
    <View className="mt-5 px-4">
      <View className="mb-2 flex-row items-center justify-between">
        <AppText variant="section" tone="label2" accessibilityRole="header">
          ASSIGNABLE PADS
        </AppText>
        {bankAddr != null ? (
          <Pressable
            onPress={toggleBank}
            accessibilityRole="button"
            accessibilityLabel="バンク選択"
            accessibilityState={{ selected: bankHeld }}
            accessibilityHint="押したままにして、次に押した PAD でバンクを選びます"
            hitSlop={6}
          >
            <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: bankHeld ? color.pst : color.fill }}>
              <AppText variant="caption" weight="700" tone={bankHeld ? 'onTint' : 'label'} maxFontSizeMultiplier={1.2}>
                {bankHeld ? 'PAD でバンクを選択' : 'BANK SELECT'}
              </AppText>
            </View>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap" style={{ gap: xp.gap }}>
        {pads.map((a, i) => (
          <Pad key={a} a={a} n={i + 1} width={w} bankMode={bankHeld} onUp={onPadUp} />
        ))}
      </View>
    </View>
  );
}

function Pad({ a, n, width, bankMode, onUp }: { a: Addr; n: number; width: number; bankMode: boolean; onUp: () => void }) {
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
        onUp();
      }}
      accessibilityRole="button"
      accessibilityLabel={`アサイナブルパッド ${n}`}
      accessibilityHint={bankMode ? `バンク ${n} を選びます` : '押している間、本体の PAD を押下します'}
    >
      <View
        style={{
          width,
          height: PAD_H,
          borderRadius: radius.card,
          backgroundColor: down ? color.accent : color.fill,
          borderWidth: bankMode ? 1.5 : 0,
          borderColor: color.pst,
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
