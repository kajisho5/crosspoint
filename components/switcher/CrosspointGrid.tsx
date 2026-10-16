import { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { DeviceProfile, TallyState } from '@/core/profiles/types';
import { xp } from '@/theme/tokens';
import { CrosspointButton, type Bus } from './CrosspointButton';

export interface CrosspointGridProps {
  profile: DeviceProfile;
  bus: Bus;
  /** 表示中バンク（0 始まり） */
  bank: number;
  selected: number | null;
  labels: string[];
  tallies: TallyState[];
  onSelect: (bus: Bus, n: number) => void;
  onSetup?: (n: number) => void;
}

/** 1 バンク分（V-160HD 5 列×2 段 / V-80HD 4 列×2 段、SPEC §9-5） */
export function CrosspointGrid({ profile, bus, bank, selected, labels, tallies, onSelect, onSetup }: CrosspointGridProps) {
  const first = bank * profile.bankSize + 1;
  const rows: number[][] = [];
  for (let i = 0; i < profile.bankSize; i += profile.columns) {
    rows.push(Array.from({ length: profile.columns }, (_, c) => first + i + c).filter((n) => n <= profile.inputCount));
  }
  const handle = useCallback((n: number) => onSelect(bus, n), [onSelect, bus]);
  // 幅は画面幅から列数で等分（ラベルの長さで伸縮させない。SPEC §11：均等グリッド）
  const { width: screenWidth } = useWindowDimensions();
  const buttonWidth = Math.floor((screenWidth - xp.sidePadding * 2 - xp.gap * (profile.columns - 1)) / profile.columns);

  return (
    <View style={{ paddingHorizontal: xp.sidePadding, gap: xp.gap }}>
      {rows.map((row) => (
        <View key={row[0]} className="flex-row" style={{ gap: xp.gap }}>
          {row.map((n) => (
            <CrosspointButton
              key={n}
              n={n}
              label={labels[n - 1] ?? `INPUT ${n}`}
              bus={bus}
              selected={selected === n}
              tally={tallies[n - 1] ?? 'off'}
              onPress={handle}
              onLongPress={onSetup}
              width={buttonWidth}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
