import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLogStore } from '@/stores/log';
import { color, radius } from '@/theme/tokens';
import { AppText } from './AppText';

/**
 * 画面内で JS 例外が出てもアプリごと落とさず、内容を表示して戻れるようにする（リリースビルドの未捕捉例外は RCTFatal で即終了する）。
 * 例外は送受信ログにも残す（診断 → レポートで共有できる）。
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const where = this.props.label ? `${this.props.label}: ` : '';
    useLogStore.getState().push({ ts: Date.now(), dir: 'info', text: `JS エラー ${where}${error.name}: ${error.message}` });
    const stack = (info.componentStack ?? '').split('\n').filter((l) => l.trim().length > 0).slice(0, 6).join(' › ');
    if (stack) useLogStore.getState().push({ ts: Date.now(), dir: 'info', text: `  at ${stack}` });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppText variant="headline">この画面でエラーが起きました</AppText>
        <AppText variant="footnote" tone="label2">
          アプリは落ちていません。「診断」→「レポート」で共有すると原因を直せます。
        </AppText>
        <View style={{ backgroundColor: color.group, borderRadius: radius.card, padding: 12 }}>
          <AppText variant="caption" mono selectable>
            {`${error.name}: ${error.message}`}
          </AppText>
        </View>
        <Pressable onPress={() => this.setState({ error: null })} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <View style={{ height: 48, borderRadius: radius.card, backgroundColor: color.fill, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" weight="600" tone="accent">
              もう一度表示
            </AppText>
          </View>
        </Pressable>
      </ScrollView>
    );
  }
}
