import { FlatList, Pressable, Share, View } from 'react-native';
import { useLogStore, type LogLine } from '@/stores/log';
import { formatTs } from '@/lib/format';
import { AppText } from '@/components/ui/AppText';
import { color } from '@/theme/tokens';

const DIR_MARK: Record<LogLine['dir'], string> = { tx: '→', rx: '←', info: '·' };
const DIR_TONE = { tx: 'accent', rx: 'pst', info: 'label2' } as const;

/** F10 送受信ログ（直近 500 件） */
export default function DiagnosticsScreen() {
  const lines = useLogStore((s) => s.lines);
  const paused = useLogStore((s) => s.paused);
  const setPaused = useLogStore((s) => s.setPaused);
  const clear = useLogStore((s) => s.clear);

  const share = () => {
    const text = lines.map((l) => `${formatTs(l.ts)} ${l.dir.toUpperCase()} ${l.text}`).join('\n');
    void Share.share({ message: text });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View className="flex-row px-4 py-2" style={{ gap: 16 }}>
        <ToolbarButton label={paused ? '再開' : '一時停止'} onPress={() => setPaused(!paused)} />
        <ToolbarButton label="消去" onPress={clear} />
        <ToolbarButton label="共有" onPress={share} disabled={lines.length === 0} />
        <AppText variant="caption" tone="label2" mono className="ml-auto self-center">
          {lines.length} 件
        </AppText>
      </View>
      <FlatList
        data={[...lines].reverse()}
        keyExtractor={(l) => String(l.id)}
        contentInsetAdjustmentBehavior="automatic"
        initialNumToRender={40}
        ListEmptyComponent={
          <AppText variant="footnote" tone="label2" align="center" className="mt-10">
            ログはまだありません
          </AppText>
        }
        renderItem={({ item }) => (
          <View className="flex-row px-4 py-1" style={{ gap: 8 }}>
            <AppText variant="caption2" tone="label3" mono>
              {formatTs(item.ts)}
            </AppText>
            <AppText variant="caption2" tone={DIR_TONE[item.dir]} mono weight="700">
              {DIR_MARK[item.dir]}
            </AppText>
            <AppText variant="caption2" mono className="flex-1" selectable>
              {item.text}
            </AppText>
          </View>
        )}
      />
    </View>
  );
}

function ToolbarButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={10} style={({ pressed }) => ({ opacity: disabled ? 0.3 : pressed ? 0.5 : 1, paddingVertical: 6 })}>
      <AppText variant="body" tone="accent">
        {label}
      </AppText>
    </Pressable>
  );
}
