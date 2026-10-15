import { useCallback } from 'react';
import { View } from 'react-native';
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
}

/** 1 バンク分（V-160HD 5 列×2 段 / V-80HD 4 列×2 段、SPEC §9-5） */
export function CrosspointGrid({ profile, bus, bank, selected, labels, tallies, onSelect }: CrosspointGridProps) {
  const first = bank * profile.bankSize + 1;
  const rows: number[][] = [];
  for (let i = 0; i < profile.bankSize; i += profile.columns) {
    rows.push(Array.from({ length: profile.columns }, (_, c) => first + i + c).filter((n) => n <= profile.inputCount));
  }
  const handle = useCallback((n: number) => onSelect(bus, n), [onSelect, bus]);

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
            />
          ))}
        </View>
      ))}
    </View>
  );
}
