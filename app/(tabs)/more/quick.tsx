import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { decodeParam } from '@/core/params';
import { embeddedAudioPreset, hdmiOut3Assign, sdiLevelAPreset, type QuickPreset } from '@/core/params/quick';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useBytes } from '@/stores/param';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';

/**
 * F14 クイック操作：よく使う設定を 1 タップで。
 *  - HDMI OUT 3 の出力割当（PROGRAM / PREVIEW / MULTI-VIEW）
 *  - 一括設定（HDMI/SDI 入力音声 −16.8 dB＋LR MIX、SDI OUT 全 LEVEL-A）— 件数が多いので確認してから送る
 * 対象パラメータが無い機種ではその項目を出さない（SPEC §9-5）。
 */
export default function QuickScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const out3 = useMemo(() => hdmiOut3Assign(profile.model), [profile.model]);
  const presets = useMemo(() => [embeddedAudioPreset(profile.model), sdiLevelAPreset(profile.model)].filter((p): p is QuickPreset => p != null), [profile.model]);

  const ranges = useMemo(() => (out3 ? [{ addr: out3.addr, size: out3.param.size }] : []), [out3]);
  useFocusEffect(
    useCallback(() => {
      controller.readRanges(ranges);
      controller.setExtraPoll(ranges);
      return () => controller.setExtraPoll(null);
    }, [ranges]),
  );
  useEffect(() => {
    if (online) controller.readRanges(ranges);
  }, [online, ranges]);

  const out3Bytes = useBytes(out3?.addr ?? null, out3?.param.size ?? 1);
  const out3Value = out3 && out3Bytes ? decodeParam(out3.param, out3Bytes) : null;
  const out3Index = out3Value?.kind === 'enum' ? out3Value.index : -1;

  const runPreset = (p: QuickPreset) => {
    Alert.alert(p.title, `${p.detail}\n\n${p.writes.length} 件を書き込みます。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '実行',
        onPress: () => {
          for (const w of p.writes) controller.write(w.addr, w.bytes);
          haptic.success();
        },
      },
    ]);
  };

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3">
        {out3 ? (
          <GroupCard title="HDMI OUT 3 の出力" footer={`現在：${out3Value?.kind === 'enum' ? out3Value.label : '—'}（VIDEO ASSIGN › ${out3.param.name}）`}>
            <View className="flex-row px-4 py-3" style={{ gap: 10 }}>
              {out3.choices.map((c) => (
                <BigButton
                  key={c.label}
                  label={c.label}
                  active={c.index === out3Index}
                  disabled={!online}
                  accessibilityLabel={`HDMI OUT 3 を ${c.label} に`}
                  onPress={() => {
                    haptic.select();
                    controller.write(out3.addr, [c.index]);
                  }}
                />
              ))}
            </View>
          </GroupCard>
        ) : null}

        {presets.length > 0 ? (
          <GroupCard title="一括設定" footer="タップすると内容を確認してから本体へ書き込みます。各値は後から「メニュー（全パラメータ）」で個別に直せます。">
            {presets.map((p) => (
              <ListRow key={p.id} title={p.title} subtitle={p.detail} icon="bolt.fill" iconTint="warn" chevron disabled={!online} onPress={() => runPreset(p)} />
            ))}
          </GroupCard>
        ) : null}

        {!out3 && presets.length === 0 ? (
          <AppText variant="body" tone="label2">
            {profile.model} にはクイック操作の対象パラメータがありません。
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

function BigButton({ label, active, disabled, accessibilityLabel, onPress }: { label: string; active: boolean; disabled: boolean; accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => ({ flex: 1, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <View className="items-center justify-center" style={{ height: 56, borderRadius: radius.card, backgroundColor: active ? color.accent : color.fill }}>
        <AppText variant="body" weight="600" tone={active ? 'onTint' : 'label'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
