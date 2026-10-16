import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@/theme/tokens';

/**
 * タブ画面の土台。タブバーの下までコンテンツを敷き、上下の余白は
 * contentInsetAdjustmentBehavior="automatic"（セーフエリア＋システムタブバー）に任せる（SPEC §11）。
 * scroll=false（オーディオなど縦ドラッグを画面スクロールに取られたくない画面）は ScrollView を使わず、
 * 上端だけセーフエリア分あける。scrollEnabled=false の ScrollView では iOS が初期位置をインセット分ずらさず、
 * 見出しがステータスバーに潜っていた（2026-10-17 実機）。
 */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top, paddingBottom: 16 }}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
