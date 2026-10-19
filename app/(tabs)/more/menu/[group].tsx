import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { findGroup, groupRanges, type ParamInstance } from '@/core/params';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ParamRow } from '@/components/params/ParamRow';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PickerSheet } from '@/components/params/PickerSheet';
import { PtzPad } from '@/components/params/PtzPad';
import { color, radius } from '@/theme/tokens';

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
  const footer = group.warning
    ? `注意：${group.warning}`
    : 'Remote Control Guide の項目名のまま表示しています。生の値（raw）の項目は、資料の換算が線形でないため本体の数値をそのまま編集します。';

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: group.title }} />
      <OfflineBanner />
      <FlatList
        style={{ flex: 1 }}
        data={group.params}
        keyExtractor={(p) => `${p.id}-${instance?.xx ?? ''}`}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={3}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
        ListHeaderComponent={
          <View>
            {inst && inst.length <= 4 ? (
              <Segmented values={inst.map((i) => i.label)} index={Math.min(instIndex, inst.length - 1)} onChange={setInstIndex} style={{ height: 32, marginBottom: 16 }} accessibilityLabel="系統" />
            ) : inst ? (
              <View style={{ marginBottom: 16, overflow: 'hidden', backgroundColor: color.group, borderRadius: radius.card }}>
                <ListRow title="対象" value={instance?.label ?? '—'} chevron onPress={() => setPickInst(true)} accessibilityLabel={`対象 ${instance?.label ?? ''}`} />
              </View>
            ) : null}
            {inst ? (
              <PickerSheet title="対象" options={inst.map((i) => i.label)} selectedIndex={instIndex} visible={pickInst} onSelect={setInstIndex} onClose={() => setPickInst(false)} />
            ) : null}
            {isCamera ? <PtzPad group={group} instance={instance} online={online} /> : null}
            <AppText variant="footnote" tone="label2" weight="500" className="mb-1.5 px-4" style={{ letterSpacing: 0.4 }}>
              {instance ? `${group.title} — ${instance.label}` : group.title}
            </AppText>
          </View>
        }
        renderItem={({ item: p, index }) => (
          <ErrorBoundary label={`menu/${group.id}/${p.id}`}>
            <View
              style={{
                overflow: 'hidden',
                backgroundColor: color.group,
                borderTopLeftRadius: index === 0 ? radius.card : 0,
                borderTopRightRadius: index === 0 ? radius.card : 0,
                borderBottomLeftRadius: index === group.params.length - 1 ? radius.card : 0,
                borderBottomRightRadius: index === group.params.length - 1 ? radius.card : 0,
              }}
            >
              <ParamRow p={p} instance={instance} online={online} />
              {index < group.params.length - 1 ? <View style={{ height: 0.5, marginLeft: 16, backgroundColor: color.sep }} /> : null}
            </View>
          </ErrorBoundary>
        )}
        ListFooterComponent={<AppText variant="footnote" tone="label2" className="mt-1.5 px-4">{footer}</AppText>}
      />
    </Screen>
  );
}
