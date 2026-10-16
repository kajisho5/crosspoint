import { View } from 'react-native';
import { router } from 'expo-router';
import { getCatalog, type ParamArea } from '@/core/params';
import { useDeviceSubtitle, useLayoutProfile } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/status/ScreenHeader';
import { OfflineBanner } from '@/components/status/OfflineBanner';

const AREA_TITLE: Record<ParamArea, string> = {
  video: 'ビデオ',
  audio: 'オーディオ',
  system: 'システム',
  panel: 'パネル',
  other: 'メモリー',
  tally: 'タリー',
  name: '名前',
};
const AREA_ORDER: ParamArea[] = ['video', 'audio', 'system', 'panel', 'other', 'tally', 'name'];

/** F13 設定メニュー：Remote Control Guide の全パラメータ（機種のカタログ）をグループ単位で開く */
export default function MenuScreen() {
  const profile = useLayoutProfile();
  const subtitle = useDeviceSubtitle();
  const catalog = getCatalog(profile.model);
  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title="メニュー" trailing={`${catalog.groups.reduce((n, g) => n + g.params.length, 0)} 項目`} />
      <OfflineBanner />
      <View className="px-4">
        <AppText variant="footnote" tone="label2" className="mb-4">
          {catalog.groups.length === 0
            ? `${profile.model} は LAN のテキストコマンドだけで制御する機種で、公開資料にパラメータのアドレス表がありません。スイッチャー／オーディオ／メモリーの各タブと、簡易操作（PGM/PST・トランジション・レベル・メモリー呼出）だけ使えます。`
            : '本体の MENU と同じ項目を Remote Control Guide のアドレス表どおりに操作します。値は接続先から読み取って表示します。'}
        </AppText>
        {AREA_ORDER.map((area) => {
          const groups = catalog.groups.filter((g) => g.area === area);
          if (groups.length === 0) return null;
          return (
            <GroupCard key={area} title={AREA_TITLE[area]}>
              {groups.map((g) => (
                <ListRow
                  key={g.id}
                  title={g.title}
                  subtitle={g.instances ? `${g.instances.length} 系統 × ${g.params.length} 項目` : `${g.params.length} 項目`}
                  chevron
                  onPress={() => router.push({ pathname: '/more/menu/[group]', params: { group: g.id } })}
                />
              ))}
            </GroupCard>
          );
        })}
      </View>
    </Screen>
  );
}
