import { Alert, Pressable, View } from 'react-native';
import { addr } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { Screen } from '@/components/ui/Screen';
import { OfflineBanner } from '@/components/status/OfflineBanner';

// V-160HD Remote Control Guide eng06: Button Control, [CAPTURE IMAGE] button.
const CAPTURE_IMAGE = addr(0x0b, 0x00, 0x28);

export default function StillScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const supported = profile.model === 'V-160HD';

  const confirmCapture = () => {
    Alert.alert(
      '静止画をキャプチャ',
      'V-160HD の [CAPTURE IMAGE] パネルボタンを実行します。取り込み元と保存先は本体側の設定に従います。続けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'キャプチャ',
          onPress: () => {
            haptic.impact();
            controller.tap(CAPTURE_IMAGE);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3">
        <GroupCard title="静止画キャプチャ" footer="この画面は本体のキャプチャボタンを押します。画像の一覧・プレビュー・名前編集・削除や、取り込み元／保存先の指定はまだ行えません。">
          {supported ? (
            <View className="px-4 py-4" style={{ gap: 12 }}>
              <Pressable
                disabled={!online}
                accessibilityRole="button"
                accessibilityLabel="V-160HDで静止画をキャプチャ"
                accessibilityState={{ disabled: !online }}
                onPress={confirmCapture}
                style={({ pressed }) => ({ minHeight: 64, opacity: !online ? 0.4 : pressed ? 0.75 : 1 })}
              >
                <View className="items-center justify-center" style={{ minHeight: 64, borderRadius: radius.card, backgroundColor: color.accent }}>
                  <AppText variant="headline" weight="700" tone="onTint">キャプチャ</AppText>
                </View>
              </Pressable>
              <AppText variant="footnote" tone="label2">
                実行すると、本体に設定された取り込み元・保存先で静止画を取得します。必要な設定を本体で確認してから実行してください。
              </AppText>
            </View>
          ) : (
            <View className="px-4 py-4">
              <AppText variant="body" tone="label2">{profile.model} の静止画キャプチャ操作は、現在の公開仕様マップで確認できません。</AppText>
            </View>
          )}
        </GroupCard>
      </View>
    </Screen>
  );
}
