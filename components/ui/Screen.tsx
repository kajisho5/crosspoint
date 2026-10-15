import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { color } from '@/theme/tokens';

/**
 * タブ画面の土台。タブバーの下までコンテンツを敷き、上下の余白は
 * contentInsetAdjustmentBehavior="automatic"（セーフエリア＋システムタブバー）に任せる（SPEC §11）。
 */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={scroll}
      contentContainerStyle={{ paddingBottom: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
