import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, useWindowDimensions, View } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import { useVisibleTab } from '@/lib/visibleTab';
import { useDeviceSubtitle, useLayoutProfile, useMemCurrent, useMemNames } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { Gate } from '@/components/ui/Gate';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ScreenHeader } from '@/components/status/ScreenHeader';
import { MemoryCell } from '@/components/memory/MemoryCell';
import { color } from '@/theme/tokens';
import { encodeAscii8 } from '@/core/codec/value';

const COLS = 5;
const GAP = 8;
const SIDE = 16;

/** S4 メモリー（V-80HD は「シーン」、SPEC §9-5） */
export default function MemoryScreen() {
  useVisibleTab('memory');
  const profile = useLayoutProfile();
  const subtitle = useDeviceSubtitle();
  const current = useMemCurrent(profile);
  const names = useMemNames(profile);
  const [holding, setHolding] = useState<number | null>(null);
  const [target, setTarget] = useState(current ?? 1);
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, 430) - SIDE * 2 - GAP * (COLS - 1)) / COLS);
  const short = profile.memoryNoun === 'シーン' ? 'SCENE' : 'MEM';

  useEffect(() => {
    setTarget(current ?? 1);
  }, [current]);

  const commit = useCallback((n: number) => controller.trigger(profile.addrs.memLoad, [n - 1]), [profile]);
  const save = useCallback(() => {
    const address = profile.addrs.memSave;
    if (address == null) return;
    Alert.alert(
      'メモリーを保存',
      `${short} ${String(target).padStart(2, '0')} に現在の設定を保存します。既存の内容は上書きされます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '保存', style: 'destructive', onPress: () => controller.trigger(address, [target - 1]) },
      ],
    );
  }, [profile, short, target]);

  const initialize = useCallback(() => {
    const address = profile.addrs.memInitialize;
    if (address == null) return;
    Alert.alert(
      'メモリーを初期化',
      `${short} ${String(target).padStart(2, '0')} の保存内容を初期化します。この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '初期化', style: 'destructive', onPress: () => controller.trigger(address, [target - 1]) },
      ],
    );
  }, [profile, short, target]);

  const editName = useCallback(() => {
    const address = profile.addrs.memName?.(target);
    if (address == null) return;
    Alert.prompt(
      'メモリー名を編集',
      `${short} ${String(target).padStart(2, '0')} の名前（半角英数字 8 文字まで）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存',
          onPress: (value) => {
            if (value != null && !/^[\x20-\x7E]{0,8}$/.test(value)) {
              Alert.alert('入力できません', '半角英数字などのASCII文字を8文字以内で入力してください。');
              return;
            }
            controller.write(address, encodeAscii8(value ?? '', 0x20));
          },
        },
      ],
      'plain-text',
      names[target - 1] ?? '',
    );
  }, [names, profile, short, target]);

  const rows: number[][] = [];
  for (let i = 1; i <= profile.memoryCount; i += COLS) {
    rows.push(Array.from({ length: COLS }, (_, c) => i + c).filter((n) => n <= profile.memoryCount));
  }

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title={profile.memoryNoun} />
      <OfflineBanner />
      <Gate>
        <View className="mx-4 mb-3 flex-row items-center justify-between px-4" style={{ height: 54, borderRadius: 12, backgroundColor: color.group }}>
          <View>
            <AppText variant="caption" tone="label2" weight="600">
              現在
            </AppText>
            <AppText variant="headline" weight="700" mono>
              {current == null ? '—' : `${short} ${String(current).padStart(2, '0')}`}
            </AppText>
          </View>
          <View className="items-end">
            <AppText variant="caption" tone="label2" weight="600">
              保存先
            </AppText>
            <AppText variant="headline" weight="700" mono>
              {short} {String(target).padStart(2, '0')}
            </AppText>
          </View>
        </View>

        {profile.addrs.memSave != null || profile.addrs.memInitialize != null || profile.addrs.memName != null ? (
          <View className="mx-4 mb-3 flex-row" style={{ gap: 8 }}>
            {profile.addrs.memSave != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${short} ${String(target).padStart(2, '0')} に現在の設定を保存`}
                onPress={save}
                style={{ flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: color.group, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <AppText variant="footnote" weight="700">保存</AppText>
              </Pressable>
            ) : null}
            {profile.addrs.memInitialize != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${short} ${String(target).padStart(2, '0')} を初期化`}
                onPress={initialize}
                style={{ flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: color.group, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <AppText variant="footnote" weight="700" tone="warn">初期化</AppText>
              </Pressable>
            ) : null}
            {profile.addrs.memName != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${short} ${String(target).padStart(2, '0')} の名前を編集`}
                onPress={editName}
                style={{ flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: color.group, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <AppText variant="footnote" weight="700">名前</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View className="mx-4 mb-3 items-center">
          <AppText variant="caption" tone="label2" weight="500">
            タップで保存先を選択・長押しで呼び出し
          </AppText>
        </View>

        <View style={{ paddingHorizontal: SIDE, gap: GAP }}>
          {rows.map((row) => (
            <View key={row[0]} className="flex-row" style={{ gap: GAP }}>
              {row.map((n) => (
                <MemoryCell
                  key={n}
                  n={n}
                  name={names[n - 1] ?? null}
                  current={current === n}
                  selected={target === n}
                  size={cell}
                  noun={profile.memoryNoun}
                  onHoldChange={setHolding}
                  onSelect={setTarget}
                  onCommit={commit}
                />
              ))}
            </View>
          ))}
        </View>

        {holding != null ? (
          <View className="mx-4 mt-4 items-center justify-center px-3" style={{ height: 44, borderRadius: 12, overflow: 'hidden' }} accessibilityLiveRegion="polite">
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.warn, opacity: 0.18 }} />
            <AppText variant="footnote" weight="600" tone="warn" numberOfLines={1} adjustsFontSizeToFit>
              {`${short} ${String(holding).padStart(2, '0')} を呼び出し中… 指を離すとキャンセル`}
            </AppText>
          </View>
        ) : null}
      </Gate>
    </Screen>
  );
}
