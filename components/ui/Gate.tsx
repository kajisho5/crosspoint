import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useOnline } from '@/stores/selectors';

/** 未接続時は操作を無効化し 40% 表示（SPEC §11 共通） */
export function Gate({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const online = useOnline();
  return (
    <View
      pointerEvents={online ? 'auto' : 'none'}
      accessibilityState={{ disabled: !online }}
      style={[{ opacity: online ? 1 : 0.4 }, style]}
    >
      {children}
    </View>
  );
}
