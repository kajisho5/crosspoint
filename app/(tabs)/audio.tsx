import { useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { AudioChannelDef, DeviceProfile } from '@/core/profiles/types';
import { useVisibleTab } from '@/lib/visibleTab';
import { useChannel, useDeviceSubtitle, useLayoutProfile, useMaster } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { Gate } from '@/components/ui/Gate';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';
import { ScreenHeader } from '@/components/status/ScreenHeader';
import { ChannelStrip, STRIP_H, STRIP_W } from '@/components/audio/ChannelStrip';
import { color } from '@/theme/tokens';

const GAP = 8;
const PER_PAGE = 4;
const PAGE_W = PER_PAGE * (STRIP_W + GAP);

/** S3 オーディオ（ボード S3）：横スクロールの入力ストリップ＋固定 MASTER */
export default function AudioScreen() {
  useVisibleTab('audio');
  const profile = useLayoutProfile();
  const subtitle = useDeviceSubtitle();
  const [page, setPage] = useState(0);
  const pages = Math.ceil(profile.audioInputs.length / PER_PAGE);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / PAGE_W));
  };

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title="オーディオ" />
      <OfflineBanner />
      <Gate>
        <View className="mb-2 flex-row justify-between px-4">
          <AppText variant="caption" tone="label2" weight="600" style={{ letterSpacing: 0.6 }}>
            INPUT
          </AppText>
          <AppText variant="caption" tone="label2" weight="600" style={{ letterSpacing: 0.6, width: 63, textAlign: 'center' }}>
            MASTER
          </AppText>
        </View>
        <View className="flex-row" style={{ height: STRIP_H }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PAGE_W}
            decelerationRate="fast"
            onMomentumScrollEnd={onScroll}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: GAP }}
            style={{ flex: 1 }}
            accessibilityLabel="入力チャンネル"
          >
            {profile.audioInputs.map((ch) => (
              <InputStrip key={ch.x} profile={profile} ch={ch} />
            ))}
          </ScrollView>
          <View style={{ width: 1, backgroundColor: color.sep, marginRight: 6 }} />
          <View style={{ paddingRight: 16 }}>
            <MasterStrip profile={profile} />
          </View>
        </View>
        <AppText variant="caption" tone="label3" align="center" className="mt-4">
          ← スワイプで HDMI / SDI 入力 →
        </AppText>
        <View className="mt-2 flex-row justify-center" style={{ gap: 4 }} accessibilityLabel={`${pages}ページ中${page + 1}ページ目`}>
          {Array.from({ length: pages }, (_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === page ? color.label : color.label3 }} />
          ))}
        </View>
      </Gate>
    </Screen>
  );
}

function InputStrip({ profile, ch }: { profile: DeviceProfile; ch: AudioChannelDef }) {
  const state = useChannel(profile, ch.x);
  return <ChannelStrip name={ch.short} state={state} levelAddr={profile.addrs.audioLevel(ch.x)} muteAddr={profile.addrs.audioMute ? profile.addrs.audioMute(ch.x) : null} codec={profile.audioLevelCodec} />;
}

function MasterStrip({ profile }: { profile: DeviceProfile }) {
  const state = useMaster(profile);
  return <ChannelStrip name="MAIN" state={state} levelAddr={profile.addrs.masterLevel} muteAddr={profile.addrs.masterMute} codec={profile.audioLevelCodec} master width={63} />;
}
