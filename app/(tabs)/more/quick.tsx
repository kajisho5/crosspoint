import { useCallback, useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { decodeParam, encodeEnum } from '@/core/params';
import { deleteAllStillsPreset, embeddedAudioPreset, hdmiOut3Assign, initAllMemoriesPreset, sdiLevelAPreset, testPatternTarget, type QuickPreset } from '@/core/params/quick';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useBytes } from '@/stores/param';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { INSET_CARD, useColumnWidth } from '@/components/ui/useColumnWidth';
import { OfflineBanner } from '@/components/status/OfflineBanner';

/**
 * F14 クイック操作：よく使う設定を 1 タップで。
 *  - HDMI OUT 3 の出力割当（PROGRAM / PREVIEW / MULTI-VIEW）
 *  - テストパターン（対応する最後の HDMI 入力の TEST PATTERN を選択式で）
 *  - 一括設定（HDMI/SDI 入力音声 −16.8 dB＋LR MIX、SDI OUT 全 LEVEL-A）— 件数が多いので確認してから送る
 * 対象パラメータが無い機種ではその項目を出さない（SPEC §9-5）。
 */
export default function QuickScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const out3 = useMemo(() => hdmiOut3Assign(profile.model), [profile.model]);
  const tp = useMemo(() => testPatternTarget(profile.model), [profile.model]);
  const presets = useMemo(() => [embeddedAudioPreset(profile.model), sdiLevelAPreset(profile.model)].filter((p): p is QuickPreset => p != null), [profile.model]);
  const resets = useMemo(() => [initAllMemoriesPreset(profile.model), deleteAllStillsPreset(profile.model)].filter((p): p is QuickPreset => p != null), [profile.model]);

  const ranges = useMemo(() => {
    const r: { addr: number; size: number }[] = [];
    if (out3) r.push({ addr: out3.addr, size: out3.param.size });
    if (tp) r.push({ addr: tp.addr, size: tp.param.size });
    return r;
  }, [out3, tp]);
  useFocusEffect(
    useCallback(() => {
      if (online) controller.readRanges(ranges);
      controller.setExtraPoll(ranges);
      return () => controller.setExtraPoll(null);
    }, [online, ranges]),
  );

  const out3Bytes = useBytes(out3?.addr ?? null, out3?.param.size ?? 1);
  const out3Value = out3 && out3Bytes ? decodeParam(out3.param, out3Bytes) : null;
  const out3Index = out3Value?.kind === 'enum' ? out3Value.index : -1;
  const tpBytes = useBytes(tp?.addr ?? null, tp?.param.size ?? 1);
  const tpValue = tp && tpBytes ? decodeParam(tp.param, tpBytes) : null;
  const tpIndex = tpValue?.kind === 'enum' ? tpValue.index : -1;

  const runPreset = (p: QuickPreset) => {
    Alert.alert(p.title, `${p.detail}\n\n${p.writes.length} 件を書き込みます。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: p.destructive ? '実行（取り消せません）' : '実行',
        style: p.destructive ? 'destructive' : 'default',
        onPress: () => {
          for (const w of p.writes) {
            if (w.trigger) controller.trigger(w.addr, w.bytes);
            else controller.write(w.addr, w.bytes);
          }
          if (p.destructive) haptic.warning();
          else haptic.success();
        },
      },
    ]);
  };

  const out3Width = useColumnWidth(Math.max(1, out3?.choices.length ?? 1), INSET_CARD, 10);
  const tpWidth = useColumnWidth(3, INSET_CARD, 10);

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
                  width={out3Width}
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

        {tp ? (
          <GroupCard title={`テストパターン（${tp.instance.label}）`} footer={`現在：${tpValue?.kind === 'enum' ? tpValue.label : '—'}。${tp.instance.label} の TEST PATTERN を切り替えます。INPUT に ${tp.instance.label} を割り当てておくと PGM/PST に出せます。`}>
            <View className="flex-row flex-wrap px-4 py-3" style={{ gap: 10 }}>
              {tp.choices.map((c) => (
                <View key={c.label}>
                  <BigButton
                    label={c.label}
                    width={tpWidth}
                    active={c.index === tpIndex}
                    disabled={!online}
                    accessibilityLabel={`テストパターンを ${c.label} に`}
                    onPress={() => {
                      haptic.select();
                      controller.write(tp.addr, encodeEnum(tp.param, c.index));
                    }}
                  />
                </View>
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

        {resets.length > 0 ? (
          <GroupCard title="初期化・削除" footer="確認ダイアログの後に実行します。マクロの初期化はリモート制御用のアドレス・コマンドが公開されていないため、本体の MENU → MACRO から行ってください。">
            {resets.map((p) => (
              <ListRow key={p.id} title={p.title} subtitle={p.detail} icon="trash" iconTint="pgm" chevron disabled={!online} onPress={() => runPreset(p)} />
            ))}
          </GroupCard>
        ) : null}

        {!out3 && !tp && presets.length === 0 && resets.length === 0 ? (
          <AppText variant="body" tone="label2">
            {profile.model} にはクイック操作の対象パラメータがありません。
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

function BigButton({ label, active, disabled, accessibilityLabel, width, onPress }: { label: string; active: boolean; disabled: boolean; accessibilityLabel: string; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => ({ width, flexGrow: 0, flexShrink: 0, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <View className="items-center justify-center" style={{ width, height: 56, borderRadius: radius.card, backgroundColor: active ? color.accent : color.fill, paddingHorizontal: 4 }}>
        <AppText variant="body" weight="600" tone={active ? 'onTint' : 'label'} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
