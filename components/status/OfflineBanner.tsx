import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useConnectionStore } from '@/stores/connection';
import { LINK_ERROR_MESSAGE } from '@/core/transport/Transport';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

/** 未接続・再接続中・エラー時の上部バナー（SPEC §11 共通）。タップで接続シート */
export function OfflineBanner() {
  const link = useConnectionStore((s) => s.link);
  const error = useConnectionStore((s) => s.error);
  if (link === 'online') return null;

  const busy = link === 'connecting' || link === 'authenticating' || link === 'syncing' || link === 'reconnecting';
  const text = error ? LINK_ERROR_MESSAGE[error] : busy ? '接続処理中です…' : '未接続です。タップして接続してください。';
  const tone = busy ? 'warn' : 'pgm';

  return (
    <Pressable
      onPress={() => router.push('/connect')}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint="接続画面を開きます"
      className="mx-4 mb-3"
    >
      <View className="flex-row items-center px-3 py-2.5" style={{ borderRadius: radius.card, borderWidth: 1, borderColor: color[tone], backgroundColor: color.group }}>
        <SymbolView name={busy ? 'arrow.triangle.2.circlepath' : 'exclamationmark.triangle.fill'} size={16} tintColor={color[tone]} />
        <AppText variant="footnote" weight="600" className="ml-2 flex-1">
          {text}
        </AppText>
      </View>
    </Pressable>
  );
}
