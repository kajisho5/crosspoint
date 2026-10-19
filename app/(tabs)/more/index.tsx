import { ActionSheetIOS, Alert, Platform, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { startDemo } from '@/lib/demo';
import { useVisibleTab } from '@/lib/visibleTab';
import { useConnectionStore } from '@/stores/connection';
import { useDeviceSubtitle, useProfile } from '@/stores/selectors';
import { POLL_OPTIONS_MS, useSettingsStore, type PgmValueMode, type PollMs } from '@/stores/settings';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/status/ScreenHeader';

const PGM_MODE_LABEL: Record<PgmValueMode, string> = { logical20: 'INPUT 1–20', guide10: 'ガイド準拠' };

function pick<T extends string | number>(title: string, options: readonly T[], label: (v: T) => string, onPick: (v: T) => void) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options.map(label), 'キャンセル'], cancelButtonIndex: options.length }, (i) => {
      const v = options[i];
      if (v !== undefined) onPick(v);
    });
    return;
  }
  Alert.alert(title, undefined, [...options.map((v) => ({ text: label(v), onPress: () => onPick(v) })), { text: 'キャンセル', style: 'cancel' as const }]);
}

/** S5 その他 */
export default function MoreScreen() {
  useVisibleTab('more');
  const subtitle = useDeviceSubtitle();
  const link = useConnectionStore((s) => s.link);
  const deviceName = useConnectionStore((s) => s.deviceName);
  const kind = useConnectionStore((s) => s.transport);
  const demo = useConnectionStore((s) => s.demo);
  const profile = useProfile();
  const s = useSettingsStore();

  const confirmDisconnect = () => {
    Alert.alert('切断しますか？', deviceName ?? undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '切断', style: 'destructive', onPress: () => void controller.disconnect('ユーザー操作') },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title="その他" />
      <View className="px-4">
        <GroupCard title="接続">
          <ListRow
            icon={kind === 'usb' ? 'cable.connector' : kind === 'ble' ? 'antenna.radiowaves.left.and.right' : kind === 'mock' ? 'play.rectangle' : 'wifi'}
            title={deviceName ?? '未接続'}
            subtitle={link === 'online' ? (demo ? 'デモモード' : 'オンライン') : '接続先を選ぶ'}
            chevron
            onPress={() => router.push('/connect')}
          />
          {link !== 'idle' ? <ListRow title="切断" destructive onPress={confirmDisconnect} /> : null}
        </GroupCard>

        <GroupCard title="本体設定" footer="AUX：AUX バスのソースをボタンで切替。マクロ：1–100 をタップで実行、シーケンサーの ON/AUTO/PREV/NEXT。静止画キャプチャ：本体の CAPTURE IMAGE ボタンを実行。クイック操作：HDMI OUT 3 の出力切替、HDMI/SDI 入力音声の一括設定、SDI OUT の LEVEL-A 一括設定。メニュー：Remote Control Guide に載っている全パラメータ。">
          <ListRow title="AUX" icon="arrow.triangle.branch" chevron onPress={() => router.push('/more/aux')} />
          <ListRow title="マクロ・シーケンサー" icon="play.square.stack" chevron onPress={() => router.push('/more/macro')} />
          <ListRow title="静止画キャプチャ" icon="camera" chevron onPress={() => router.push('/more/still')} />
          {profile?.model === 'V-160HD' ? <ListRow title="静止画設定" icon="photo" chevron onPress={() => router.push('/more/menu/still-image-27')} /> : null}
          {profile?.model === 'V-160HD' ? <ListRow title="TALLY/GPO設定" icon="dot.radiowaves.left.and.right" chevron onPress={() => router.push('/more/menu/rs-232-tally-gpo-gpi-key-37')} /> : null}
          <ListRow title="クイック操作" icon="bolt.fill" iconTint="warn" chevron onPress={() => router.push('/more/quick')} />
          <ListRow title="メニュー（全パラメータ）" icon="slider.horizontal.3" chevron onPress={() => router.push('/more/menu')} />
        </GroupCard>

        <GroupCard title="操作" footer="操作ロックの解除スライダーは M5 で実装します。">
          <ListRow title="操作ロック" icon="lock.fill" iconTint="gray" right={<Switch value={s.lockEnabled} onValueChange={(v) => s.set('lockEnabled', v)} />} />
          <ListRow title="ハプティクス" icon="hand.tap" iconTint="gray" right={<Switch value={s.haptics} onValueChange={(v) => s.set('haptics', v)} />} />
          <ListRow
            title="スリープ防止"
            subtitle="接続中は画面を消灯しない"
            icon="sun.max"
            iconTint="warn"
            right={<Switch value={s.keepAwake} onValueChange={(v) => s.set('keepAwake', v)} />}
          />
        </GroupCard>

        <GroupCard title="通信" footer="PGM 値モードは V-160HD の PGM/PST に書く値の方式です（SPEC §9-3）。実機で確定するまで切り替えて確認できます。">
          <ListRow
            title="ポーリング周期"
            value={`${s.pollMs} ms`}
            valueMono
            chevron
            onPress={() => pick<PollMs>('ポーリング周期', POLL_OPTIONS_MS, (v) => `${v} ms`, (v) => s.set('pollMs', v))}
          />
          <ListRow
            title="PGM 値モード"
            value={PGM_MODE_LABEL[s.pgmValueMode]}
            chevron
            disabled={profile != null && profile.model !== 'V-160HD'}
            onPress={() =>
              pick<PgmValueMode>('PGM 値モード', ['logical20', 'guide10'], (v) => PGM_MODE_LABEL[v], (v) => s.set('pgmValueMode', v))
            }
          />
        </GroupCard>

        <GroupCard title="診断">
          <ListRow title="送受信ログ" icon="list.bullet.rectangle" iconTint="gray" chevron onPress={() => router.push('/more/diagnostics')} />
          <ListRow title="コマンド送信・アドレス読取り" icon="terminal" iconTint="gray" chevron onPress={() => router.push('/more/console')} />
        </GroupCard>

        <GroupCard title="デモ" footer="実機なしで全画面を操作できます。デモ中は実機への接続処理を行いません。">
          <ListRow title="デモモードで試す" icon="play.rectangle" chevron onPress={() => void startDemo()} />
        </GroupCard>

        <GroupCard>
          <ListRow title="このアプリについて" icon="info.circle" iconTint="gray" chevron onPress={() => router.push('/more/about')} />
        </GroupCard>
      </View>
    </Screen>
  );
}
