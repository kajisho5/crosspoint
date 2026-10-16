import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { decodeAscii8 } from '@/core/codec/value';
import { decodeParam, encodeEnum } from '@/core/params';
import { auxBuses, groupAuxLabels, type AuxBus } from '@/core/params/quick';
import type { DeviceProfile } from '@/core/profiles/types';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { readBytes, useParamStore } from '@/stores/param';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius, xp } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { INSET_PAGE, useColumnWidth } from '@/components/ui/useColumnWidth';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { useShallow } from 'zustand/react/shallow';

/**
 * F15 AUX モード：AUX バスのソースをクロスポイント風のボタンで切り替える。
 *  - バスは機種のカタログから（V-160HD：AUX 1 本、V-80HD：Aux 1 / Aux 2）。複数なら Segmented で切替
 *  - ボタンは AUX SOURCE の列挙（HDMI / SDI / STILL / その他）を種類ごとに 4 列で並べ、8 文字ラベルがあれば併記
 *  - そのバスを出している出力（HDMI OUT n / SDI OUT n / USB …）をフッターに表示
 */
const COLUMNS = 4;

export default function AuxScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const buses = useMemo(() => auxBuses(profile.model), [profile.model]);
  const [busIndex, setBusIndex] = useState(0);
  const bus = buses[busIndex] ?? buses[0] ?? null;

  const ranges = useMemo(() => {
    const r: { addr: number; size: number }[] = [];
    for (const b of buses) {
      r.push({ addr: b.addr, size: b.param.size });
      for (const o of b.outputs) r.push({ addr: o.addr, size: o.param.size });
    }
    return r;
  }, [buses]);
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

  if (!bus) {
    return (
      <Screen>
        <View className="px-4 py-6">
          <AppText variant="body" tone="label2">
            {profile.model} には AUX バスのパラメータがありません。
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3">
        {buses.length > 1 ? (
          <Segmented values={buses.map((b) => b.name)} index={busIndex} onChange={setBusIndex} accessibilityLabel="AUX バス" style={{ marginBottom: 12 }} />
        ) : null}
        <AuxBusPanel key={bus.name} bus={bus} profile={profile} online={online} />
      </View>
    </Screen>
  );
}

function AuxBusPanel({ bus, profile, online }: { bus: AuxBus; profile: DeviceProfile; online: boolean }) {
  const current = useParamStore(useShallow((s) => readBytes(s.values, bus.addr, bus.param.size)));
  const loaded = !current.some((v) => v === undefined);
  const value = loaded ? decodeParam(bus.param, current as number[]) : null;
  const selectedIndex = value?.kind === 'enum' ? value.index : -1;

  const outputsOn = useParamStore(
    useShallow((s) => bus.outputs.filter((o) => s.values[o.addr] === o.param.values[o.auxIndex]).map((o) => o.name)),
  );
  // 8 文字ラベル（HDMI/SDI/STILL は列挙 index とソース code が一致する）
  const labels = useParamStore(
    useShallow((s) =>
      bus.param.labels.map((_, i) => {
        const src = profile.sources.find((x) => x.code === bus.param.values[i]);
        if (!src || src.labelAddr == null) return null;
        const bytes = readBytes(s.values, src.labelAddr, 8);
        if (bytes.some((v) => v === undefined)) return null;
        const text = decodeAscii8(bytes as number[]).trim();
        return text.length > 0 && text !== src.name ? text : null;
      }),
    ),
  );

  const sections = useMemo(() => groupAuxLabels(bus.param.labels), [bus.param.labels]);
  const buttonWidth = useColumnWidth(COLUMNS, INSET_PAGE);
  const select = (i: number) => {
    haptic.select();
    controller.write(bus.addr, encodeEnum(bus.param, i));
  };

  return (
    <>
      <GroupCard title={`${bus.name} ソース`} footer={outputsOn.length > 0 ? `${bus.name} を出している出力：${outputsOn.join('、')}` : `${bus.name} を出している出力はありません（VIDEO ASSIGN の OUTPUT ASSIGN で ${bus.name} を選ぶと出ます）`}>
        <View className="px-4 py-3">
          <AppText variant="footnote" tone="label2">
            現在：{value?.kind === 'enum' ? value.label : '—'}
          </AppText>
        </View>
      </GroupCard>
      {sections.map((sec) => (
        <View key={sec.title} style={{ marginBottom: 16 }}>
          <AppText variant="footnote" tone="label2" style={{ marginBottom: 6, marginLeft: 4 }}>
            {sec.title}
          </AppText>
          <View style={{ gap: xp.gap }}>
            {chunk(sec.items, COLUMNS).map((row) => (
              <View key={row[0]?.index ?? 0} className="flex-row" style={{ gap: xp.gap }}>
                {row.map((it) => (
                  <AuxButton key={it.index} name={it.label} sub={labels[it.index] ?? null} bus={bus.name} selected={it.index === selectedIndex} disabled={!online || !loaded} width={buttonWidth} onPress={() => select(it.index)} />
                ))}
                              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function AuxButton({ name, sub, bus, selected, disabled, width, onPress }: { name: string; sub: string | null; bus: string; selected: boolean; disabled: boolean; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${bus} ${name}${sub ? `、${sub}` : ''}${selected ? '、選択中' : ''}`}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => ({ width, flexGrow: 0, flexShrink: 0, opacity: disabled ? 0.4 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ width, height: xp.height, borderRadius: radius.xp, backgroundColor: selected ? color.accent : color.fill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
        <AppText variant="caption2" weight="600" tone={selected ? 'onTint' : 'label'} numberOfLines={1}>
          {name}
        </AppText>
        {sub ? (
          <AppText variant="caption2" tone={selected ? 'onTint' : 'label2'} numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function chunk<T>(arr: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
