import { Stack } from 'expo-router';
import { DemoBadge } from '@/components/status/ScreenHeader';
import { useConnectionStore } from '@/stores/connection';
import { color } from '@/theme/tokens';

export default function MoreLayout() {
  // デモ中だけ右上にバッジ。常に headerRight を渡すと、中身が空でも iOS 26 のヘッダーに空の丸ボタンが出る
  const demo = useConnectionStore((s) => s.demo);
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: color.bg }, headerBackTitle: 'その他', ...(demo ? { headerRight: () => <DemoBadge /> } : {}) }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'その他' }} />
      <Stack.Screen name="quick" options={{ title: 'クイック操作' }} />
      <Stack.Screen name="aux" options={{ title: 'AUX' }} />
      <Stack.Screen name="macro" options={{ title: 'マクロ・シーケンサー' }} />
      <Stack.Screen name="still" options={{ title: '静止画キャプチャ' }} />
      <Stack.Screen name="menu/index" options={{ title: 'メニュー' }} />
      <Stack.Screen name="menu/[group]" options={{ title: '' }} />
      <Stack.Screen name="diagnostics" options={{ title: '送受信ログ' }} />
      <Stack.Screen name="console" options={{ title: 'コマンド送信' }} />
      <Stack.Screen name="about" options={{ title: 'このアプリについて' }} />
    </Stack>
  );
}
