import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import type { Addr } from '@/core/codec/value';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius, xp } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';

/**
 * F16 マクロ・シーケンサー
 *  - マクロ 1–100：タップで実行（`macroTrigger` に番号−1 を書く。Companion run_macro と同じ【事実：公開 OSS】）。
 *    マクロ名のアドレスは公開資料に無いので番号のみ表示
 *  - シーケンサー：ON / AUTO / PREV / NEXT のパネルスイッチ（モーメンタリ：押下 01 → 解放 00）
 *  対応アドレスが無い機種（V-80HD）では該当セクションを出さない（SPEC §9-5）
 */
const COLUMNS = 5;

export default function MacroScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const [last, setLast] = useState<number | null>(null);
  const macroAddr = profile.capabilities.macro ? profile.addrs.macroTrigger : null;
  const seq = profile.capabilities.sequencer ? profile.addrs.sequencer : null;

  if (!macroAddr && !seq) {
    return (
      <Screen>
        <OfflineBanner />
        <View className="px-4 py-6">
          <AppText variant="body" tone="label2">
            {profile.model} のマクロ実行・シーケンサーのアドレスは公開資料に無いため、この画面は使えません。
          </AppText>
        </View>
      </Screen>
    );
  }

  const rows: number[][] = [];
  for (let n = 1; n <= profile.macroCount; n += COLUMNS) rows.push(Array.from({ length: COLUMNS }, (_, i) => n + i).filter((m) => m <= profile.macroCount));

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3">
        {seq ? (
          <GroupCard title="シーケンサー" footer="本体のパネルスイッチと同じ動作（押している間 ON）。">
            <View className="flex-row px-4 py-3" style={{ gap: 10 }}>
              <HoldButton label="ON" a={seq.on} disabled={!online} />
              <HoldButton label="AUTO" a={seq.auto} disabled={!online} />
              <HoldButton label="PREV" a={seq.prev} disabled={!online} />
              <HoldButton label="NEXT" a={seq.next} disabled={!online} />
            </View>
          </GroupCard>
        ) : null}

        {macroAddr ? (
          <GroupCard title={`マクロ 1–${profile.macroCount}`} footer={last != null ? `最後に実行：マクロ ${last}` : 'タップで実行します。マクロ名は本体から取得できないため番号のみ表示します。'}>
            <View className="px-4 py-3" style={{ gap: xp.gap }}>
              {rows.map((row) => (
                <View key={row[0]} className="flex-row" style={{ gap: xp.gap }}>
                  {row.map((n) => (
                    <Pressable
                      key={n}
                      disabled={!online}
                      accessibilityRole="button"
                      accessibilityLabel={`マクロ ${n} を実行`}
                      onPress={() => {
                        haptic.impact();
                        controller.trigger(macroAddr, [n - 1]);
                        setLast(n);
                      }}
                      style={({ pressed }) => ({ flex: 1, opacity: !online ? 0.4 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                    >
                      <View style={{ height: 48, borderRadius: radius.xp, backgroundColor: last === n ? color.accent : color.fill, justifyContent: 'center', alignItems: 'center' }}>
                        <AppText variant="body" weight="600" mono tone={last === n ? 'onTint' : 'label'}>
                          {n}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </GroupCard>
        ) : null}
      </View>
    </Screen>
  );
}

function HoldButton({ label, a, disabled }: { label: string; a: Addr; disabled: boolean }) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`シーケンサー ${label}`}
      onPressIn={() => {
        setDown(true);
        haptic.impact();
        controller.press(a);
      }}
      onPressOut={() => {
        setDown(false);
        controller.release(a);
      }}
      style={{ flex: 1, opacity: disabled ? 0.4 : 1 }}
    >
      <View className="items-center justify-center" style={{ height: 56, borderRadius: radius.card, backgroundColor: down ? color.accent : color.fill }}>
        <AppText variant="body" weight="600" tone={down ? 'onTint' : 'label'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
