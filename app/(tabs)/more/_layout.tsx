import { Stack } from 'expo-router';
import { DemoBadge } from '@/components/status/ScreenHeader';
import { color } from '@/theme/tokens';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: color.bg }, headerRight: () => <DemoBadge /> }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="quick" options={{ title: 'クイック操作' }} />
      <Stack.Screen name="aux" options={{ title: 'AUX' }} />
      <Stack.Screen name="macro" options={{ title: 'マクロ・シーケンサー' }} />
      <Stack.Screen name="menu/index" options={{ title: 'メニュー' }} />
      <Stack.Screen name="menu/[group]" options={{ title: '' }} />
      <Stack.Screen name="diagnostics" options={{ title: '送受信ログ' }} />
      <Stack.Screen name="console" options={{ title: 'コマンド送信' }} />
      <Stack.Screen name="about" options={{ title: 'このアプリについて' }} />
    </Stack>
  );
}
