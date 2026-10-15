import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useConnectionStore } from '@/stores/connection';
import type { LinkState, TransportKind } from '@/core/transport/Transport';
import { color, type ColorToken } from '@/theme/tokens';
import { AppText } from '../ui/AppText';

const KIND_LABEL: Record<TransportKind, string> = { lan: 'LAN', usb: 'USB', ble: 'BLE', mock: 'デモ' };

const STATE_TEXT: Record<LinkState, string> = {
  idle: '未接続',
  connecting: '接続中',
  authenticating: '認証中',
  syncing: '同期中',
  online: 'オンライン',
  reconnecting: '再接続中',
  error: 'エラー',
};

function dotTone(link: LinkState): ColorToken {
  if (link === 'online') return 'pst';
  if (link === 'idle' || link === 'error') return 'pgm';
  return 'warn';
}

/** 経路・状態・RTT（ボード ConnectionPill 112×30）。タップで接続シート */
export function ConnectionPill() {
  const link = useConnectionStore((s) => s.link);
  const kind = useConnectionStore((s) => s.transport);
  const rtt = useConnectionStore((s) => s.rttMs);
  const label = kind ? KIND_LABEL[kind] : '未接続';
  const rttText = link === 'online' && rtt != null ? `${Math.round(rtt)} ms` : '—';
  return (
    <Pressable
      onPress={() => router.push('/connect')}
      accessibilityRole="button"
      accessibilityLabel={`接続：${label}、${STATE_TEXT[link]}${link === 'online' && rtt != null ? `、${Math.round(rtt)}ミリ秒` : ''}`}
      accessibilityHint="接続画面を開きます"
      hitSlop={7}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View className="flex-row items-center" style={{ width: 112, height: 30, borderRadius: 15, backgroundColor: color.group, paddingHorizontal: 12 }}>
        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: color[dotTone(link)] }} />
        <AppText variant="footnote" weight="600" className="ml-2 flex-1" numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </AppText>
        <AppText variant="caption" tone="label2" mono maxFontSizeMultiplier={1.2}>
          {rttText}
        </AppText>
      </View>
    </Pressable>
  );
}
