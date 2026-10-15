import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, 430) - SIDE * 2 - GAP * (COLS - 1)) / COLS);
  const short = profile.memoryNoun === 'シーン' ? 'SCENE' : 'MEM';

  const commit = useCallback((n: number) => controller.trigger(profile.addrs.memLoad, [n - 1]), [profile]);

  const rows: number[][] = [];
  for (let i = 1; i <= profile.memoryCount; i += COLS) {
    rows.push(Array.from({ length: COLS }, (_, c) => i + c).filter((n) => n <= profile.memoryCount));
  }

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title={profile.memoryNoun} />
      <OfflineBanner />
      <Gate>
        <View className="mx-4 mb-4 flex-row items-center justify-between px-4" style={{ height: 54, borderRadius: 12, backgroundColor: color.group }}>
          <View>
            <AppText variant="caption" tone="label2" weight="600">
              現在
            </AppText>
            <AppText variant="headline" weight="700" mono>
              {current == null ? '—' : `${short} ${String(current).padStart(2, '0')}`}
            </AppText>
          </View>
          <AppText variant="footnote" tone="label2" weight="500">
            長押しで呼び出し
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
                  size={cell}
                  noun={profile.memoryNoun}
                  onHoldChange={setHolding}
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
