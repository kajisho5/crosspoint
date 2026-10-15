import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { findGroup, groupRanges, type ParamInstance } from '@/core/params';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ParamRow } from '@/components/params/ParamRow';
import { PickerSheet } from '@/components/params/PickerSheet';
import { PtzPad } from '@/components/params/PtzPad';

/** F13 設定メニュー：1 グループ（必要なら系統を選ぶ）。開いている間はその範囲を追加でポーリングする */
export default function MenuGroupScreen() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const group = useMemo(() => (groupId ? findGroup(profile.model, groupId) : undefined), [profile.model, groupId]);
  const [instIndex, setInstIndex] = useState(0);
  const [pickInst, setPickInst] = useState(false);
  const instance: ParamInstance | null = group?.instances ? (group.instances[instIndex] ?? group.instances[0] ?? null) : null;

  const ranges = useMemo(() => (group ? groupRanges(group, instance) : []), [group, instance]);

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

  if (!group) {
    return (
      <Screen>
        <View className="px-4 py-6">
          <AppText variant="body" tone="label2">
            このグループは見つかりません。
          </AppText>
        </View>
      </Screen>
    );
  }

  const inst = group.instances;
  const isCamera = group.params.some((p) => p.id === 'pan') && group.params.some((p) => p.id === 'tilt');

  return (
    <Screen>
      <Stack.Screen options={{ title: group.title }} />
      <OfflineBanner />
      <View className="px-4 pt-3">
        {inst && inst.length <= 4 ? (
          <Segmented values={inst.map((i) => i.label)} index={Math.min(instIndex, inst.length - 1)} onChange={setInstIndex} style={{ height: 32, marginBottom: 16 }} accessibilityLabel="系統" />
        ) : inst ? (
          <GroupCard>
            <ListRow title="対象" value={instance?.label ?? '—'} chevron onPress={() => setPickInst(true)} accessibilityLabel={`対象 ${instance?.label ?? ''}`} />
          </GroupCard>
        ) : null}
        {inst ? (
          <PickerSheet title="対象" options={inst.map((i) => i.label)} selectedIndex={instIndex} visible={pickInst} onSelect={setInstIndex} onClose={() => setPickInst(false)} />
        ) : null}

        {isCamera ? <PtzPad group={group} instance={instance} online={online} /> : null}

        <GroupCard
          title={instance ? `${group.title} — ${instance.label}` : group.title}
          footer={group.warning ? `注意：${group.warning}` : 'Remote Control Guide の項目名のまま表示しています。'}
        >
          {group.params.map((p) => (
            <ParamRow key={`${p.id}-${instance?.xx ?? ''}`} p={p} instance={instance} online={online} />
          ))}
        </GroupCard>
      </View>
    </Screen>
  );
}
