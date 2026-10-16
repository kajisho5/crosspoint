import '../global.css';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { controller } from '@/core/controller/DeviceController';
import { useConnectionStore } from '@/stores/connection';
import { useSettingsStore } from '@/stores/settings';
import { color } from '@/theme/tokens';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const KEEP_AWAKE_TAG = 'crosspoint-online';

/** スリープ防止（F9）：設定オンかつ接続中のみ */
function useKeepAwakeWhileOnline() {
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const online = useConnectionStore((s) => s.link === 'online');
  useEffect(() => {
    if (keepAwake && online) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
      };
    }
    return undefined;
  }, [keepAwake, online]);
}

/** 非アクティブになったら押下中のモーメンタリを必ず解放（SPEC §9-2） */
function useReleaseOnBackground() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') controller.releaseAll();
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useKeepAwakeWhileOnline();
  useReleaseOnBackground();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="auto" />
      <ErrorBoundary label="root">
        <Stack screenOptions={{ contentStyle: { backgroundColor: color.bg } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="connect" options={{ presentation: 'modal', title: '接続', headerShown: true }} />
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
