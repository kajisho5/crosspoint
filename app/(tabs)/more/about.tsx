import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';
import { startDemo } from '@/lib/demo';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { color } from '@/theme/tokens';

/** About：非公式アプリである旨と商標表記（SPEC §11 S5）、デモモード起動（F11） */
export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '—';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16 }}>
      <View className="mb-6 items-center">
        <AppText variant="title">SW CROSSPOINT</AppText>
        <AppText variant="footnote" tone="label2" mono className="mt-1">
          {`バージョン ${version}`}
        </AppText>
      </View>
      <GroupCard title="対応機種" footer="V-80HD・VR-120HD は現在 LAN 接続のみ対応しています（USB / Bluetooth は実機確認後に有効化）。USB は公開資料に USB MIDI の明記が無い機種が多く、実機で要確認です。確認は「診断」→「レポート」で共有できます。">
        <ListRow title="V-160HD" subtitle="LAN / USB / Bluetooth" />
        <ListRow title="V-80HD" subtitle="LAN" />
        <ListRow title="VR-120HD" subtitle="LAN" />
        <ListRow title="VR-6HD" subtitle="LAN / USB / Bluetooth" />
        <ListRow title="V-1-4K" subtitle="LAN / USB" />
        <ListRow title="V-8HD" subtitle="USB" />
        <ListRow title="V-1HD" subtitle="USB（MIDI Rx SOURCE = USB）" />
        <ListRow title="V-02HD MK II" subtitle="USB" />
        <ListRow title="V-1SDI" subtitle="MIDI IN（USB MIDI インターフェース経由）" />
        <ListRow title="VR-4HD" subtitle="MIDI IN（USB MIDI インターフェース経由）" />
        <ListRow title="V-60HD" subtitle="LAN（テキストコマンド）" />
        <ListRow title="V-600UHD" subtitle="LAN（テキストコマンド）" />
        <ListRow title="VR-50HD MK II" subtitle="LAN（テキストコマンド）" />
      </GroupCard>
      <GroupCard>
        <ListRow
          title="デモモードで試す"
          icon="play.rectangle"
          chevron
          onPress={async () => {
            if (await startDemo()) router.navigate('/switcher');
          }}
        />
      </GroupCard>
      <GroupCard title="ご注意">
        <View className="px-4 py-3" style={{ gap: 8 }}>
          <AppText variant="footnote">
            本アプリは非公式アプリです。Roland Corporation が提供・承認・保証するものではありません。
          </AppText>
          <AppText variant="footnote" tone="label2">
            Roland、V-160HD、V-80HD、VR-120HD、VR-6HD、V-1-4K、V-8HD、V-1HD、V-1SDI、VR-4HD、V-02HD MK II、V-60HD、V-600UHD、VR-50HD MK II は Roland Corporation の日本およびその他の国における登録商標または商標です。その他の社名・製品名は各社の商標または登録商標です。
          </AppText>
          <AppText variant="footnote" tone="label2">
            本アプリは各機種の公開 Remote Control Guide に記載された制御仕様に基づいて動作します。本番運用の前に必ずリハーサルで動作を確認してください。
          </AppText>
        </View>
      </GroupCard>
    </ScrollView>
  );
}
