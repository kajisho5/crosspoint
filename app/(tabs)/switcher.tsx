import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useVisibleTab } from '@/lib/visibleTab';
import { useConnectionStore } from '@/stores/connection';
import { useBusInput, useInputLabels, useLayoutProfile, useTallies } from '@/stores/selectors';
import { useSettingsStore } from '@/stores/settings';
import { AppText } from '@/components/ui/AppText';
import { Gate } from '@/components/ui/Gate';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ScreenHeader } from '@/components/status/ScreenHeader';
import { CrosspointGrid } from '@/components/switcher/CrosspointGrid';
import type { Bus } from '@/components/switcher/CrosspointButton';
import { TBar } from '@/components/switcher/TBar';
import { AutoButton, CutAutoUnavailable, CutButton } from '@/components/switcher/TransitionButtons';
import { TransitionPicker } from '@/components/switcher/TransitionPicker';
import { color } from '@/theme/tokens';

/** S1 スイッチャー（ボード S1） */
export default function SwitcherScreen() {
  useVisibleTab('switcher');
  const profile = useLayoutProfile();
  const deviceName = useConnectionStore((s) => s.deviceName);
  const version = useConnectionStore((s) => s.version);
  const pgmMode = useSettingsStore((s) => s.pgmValueMode);
  const labels = useInputLabels(profile);
  const tallies = useTallies(profile);
  const pgm = useBusInput(profile, 'pgm');
  const pst = useBusInput(profile, 'pst');
  const [bank, setBank] = useState(0);

  const banks = Math.ceil(profile.inputCount / profile.bankSize);
  const bankLabels = Array.from({ length: banks }, (_, i) => `${i * profile.bankSize + 1}–${Math.min(profile.inputCount, (i + 1) * profile.bankSize)}`);
  const safeBank = Math.min(bank, banks - 1);

  const onSelect = useCallback(
    (bus: Bus, n: number) => {
      haptic.select();
      controller.write(bus === 'pgm' ? profile.addrs.pgm : profile.addrs.pst, [controller.encodePgmValue(profile, n, pgmMode)]);
    },
    [profile, pgmMode],
  );

  return (
    <Screen>
      <ScreenHeader subtitle={deviceName ?? '未接続'} title={profile.model} trailing={version ? `FW ${version}` : undefined} />
      <OfflineBanner />
      <Gate>
        <TransitionPicker profile={profile} />

        <View className="mt-4 flex-row items-center justify-between px-4" style={{ marginBottom: 8 }}>
          <BusLabel bus="pgm" />
          {banks > 1 ? (
            <Segmented values={bankLabels} index={safeBank} onChange={setBank} style={{ width: 132, height: 28 }} accessibilityLabel="バンク" />
          ) : null}
        </View>
        <CrosspointGrid profile={profile} bus="pgm" bank={safeBank} selected={pgm} labels={labels} tallies={tallies} onSelect={onSelect} />

        <View className="mt-4 px-4" style={{ marginBottom: 8 }}>
          <BusLabel bus="pst" />
        </View>
        <CrosspointGrid profile={profile} bus="pst" bank={safeBank} selected={pst} labels={labels} tallies={tallies} onSelect={onSelect} />

        <View className="mt-5 flex-row px-4" style={{ gap: 12 }}>
          <View style={{ flex: 172, gap: 10 }}>
            {profile.capabilities.cutAuto ? (
              <>
                <CutButton profile={profile} />
                <AutoButton profile={profile} />
              </>
            ) : (
              <CutAutoUnavailable />
            )}
          </View>
          <View style={{ flex: 177 }}>
            <TBar profile={profile} height={246} />
          </View>
        </View>
      </Gate>
    </Screen>
  );
}

function BusLabel({ bus }: { bus: Bus }) {
  return (
    <View className="flex-row items-center" accessibilityRole="header">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color[bus], marginRight: 6 }} />
      <AppText variant="section" tone={bus}>
        {bus === 'pgm' ? 'PROGRAM' : 'PRESET'}
      </AppText>
    </View>
  );
}
