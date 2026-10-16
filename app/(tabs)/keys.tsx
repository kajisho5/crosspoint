import { View } from 'react-native';
import type { DeviceProfile, KeyKind } from '@/core/profiles/types';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useVisibleTab } from '@/lib/visibleTab';
import { labelOfSource, useDeviceSubtitle, useInputLabels, useKey, useLayoutProfile, useSplit } from '@/stores/selectors';
import { useParamStore } from '@/stores/param';
import { GroupCard } from '@/components/ui/GroupCard';
import { Gate } from '@/components/ui/Gate';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ScreenHeader } from '@/components/status/ScreenHeader';
import { KeyRow, TogglePill } from '@/components/keys/KeyRow';

/** DSK TYPE（V-160HD 001F05 / V-80HD 001406：両機種の Remote Control Guide で同じ並び） */
const DSK_TYPE = ['LUM-WHITE', 'LUM-BLACK', 'CHROMA'] as const;

/** S2 キー（ボード S2） */
export default function KeysScreen() {
  useVisibleTab('keys');
  const profile = useLayoutProfile();
  const subtitle = useDeviceSubtitle();
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title="キー" />
      <OfflineBanner />
      <Gate style={{ paddingHorizontal: 16 }}>
        {profile.pinpCount > 0 ? (
          <GroupCard title="PinP & KEY">
            {range(profile.pinpCount).map((n) => (
              <KeyLine key={`p${n}`} profile={profile} kind="pinp" n={n} />
            ))}
          </GroupCard>
        ) : null}
        <GroupCard title="DSK">
          {range(profile.dskCount).map((n) => (
            <KeyLine key={`d${n}`} profile={profile} kind="dsk" n={n} />
          ))}
        </GroupCard>
        {profile.capabilities.split ? (
          <GroupCard title="SPLIT">
            {range(profile.splitCount).map((n) => (
              <SplitLine key={`s${n}`} profile={profile} n={n} />
            ))}
          </GroupCard>
        ) : null}
      </Gate>
    </Screen>
  );
}

function useKeySourceLabel(profile: DeviceProfile, v: number | undefined): string {
  const inputLabels = useInputLabels(profile);
  return useParamStore((s) => {
    if (v === undefined) return '—';
    if (profile.sources.some((x) => x.code === v)) return labelOfSource(profile, s.values, v);
    const n = profile.decodeInput(v, () => undefined);
    return n != null ? (inputLabels[n - 1] ?? `INPUT ${n}`) : `SRC ${v}`;
  });
}

function KeyLine({ profile, kind, n }: { profile: DeviceProfile; kind: KeyKind; n: number }) {
  const k = useKey(profile, kind, n);
  const addrs = kind === 'pinp' ? profile.addrs.pinp(n) : profile.addrs.dsk(n);
  const src = useKeySourceLabel(profile, k.source);
  const name = kind === 'pinp' ? `PinP & KEY ${n}` : profile.dskCount > 1 ? `DSK ${n}` : 'DSK';
  const typeText = kind === 'dsk' && k.type !== undefined ? DSK_TYPE[k.type] : undefined;
  const sub = [src, typeText, k.time == null ? null : `${k.time.toFixed(1)}s`].filter(Boolean).join(' · ');

  const toggle = (which: 'pgm' | 'pvw', cur: boolean | null) => {
    if (cur == null) return;
    haptic.select();
    controller.write(which === 'pgm' ? addrs.pgm : addrs.pvw, [cur ? 0 : 1]);
  };

  return (
    <KeyRow name={name} sub={sub}>
      <TogglePill label="PGM" tone="pgm" on={k.pgm} a11yName={name} onPress={() => toggle('pgm', k.pgm)} />
      <TogglePill label="PVW" tone="pst" on={k.pvw} a11yName={name} onPress={() => toggle('pvw', k.pvw)} />
    </KeyRow>
  );
}

function SplitLine({ profile, n }: { profile: DeviceProfile; n: number }) {
  const on = useSplit(profile, n);
  return (
    <KeyRow name={`SPLIT ${n}`} sub={on == null ? '—' : on ? 'ON' : 'OFF'}>
      <View>
        <TogglePill
          label="ON"
          tone="pgm"
          on={on}
          a11yName={`SPLIT ${n}`}
          onPress={() => {
            if (on == null) return;
            haptic.select();
            controller.write(profile.addrs.split(n), [on ? 0 : 1]);
          }}
        />
      </View>
    </KeyRow>
  );
}
