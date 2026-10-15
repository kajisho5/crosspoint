import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import { LINK_ERROR_MESSAGE } from '@/core/transport/Transport';
import { startDemo } from '@/lib/demo';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { deletePassword, loadPassword, newDeviceId, savePassword, useDevicesStore, type SavedDevice } from '@/stores/devices';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { ListRow } from '@/components/ui/ListRow';
import { Segmented } from '@/components/ui/Segmented';
import { color, font, radius } from '@/theme/tokens';

const ROUTES = ['LAN / Wi-Fi', 'USB', 'Bluetooth'] as const;
const DEFAULT_PORT = 8023;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const BUSY_TEXT = { connecting: '接続中…', authenticating: '認証中…  VER 確認待ち', syncing: '同期中…', reconnecting: '再接続中…' } as const;

/** S0 接続（モーダル） */
export default function ConnectScreen() {
  const [route, setRoute] = useState(0);
  const saved = useDevicesStore((s) => s.saved);
  const lastUsedId = useDevicesStore((s) => s.lastUsedId);
  const link = useConnectionStore((s) => s.link);
  const error = useConnectionStore((s) => s.error);
  const deviceName = useConnectionStore((s) => s.deviceName);
  const demo = useConnectionStore((s) => s.demo);

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(String(DEFAULT_PORT));
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const portNum = Number(port);
  const formValid =
    name.trim().length > 0 &&
    IPV4.test(host.trim()) &&
    Number.isInteger(portNum) &&
    portNum >= 1 &&
    portNum <= 65535 &&
    (password.length === 4 || password.length === 8) &&
    /^[\x20-\x7e]+$/.test(password);

  const connectSaved = async (d: SavedDevice) => {
    if (d.transport !== 'lan') {
      setNotice('USB / Bluetooth 接続は開発中です（M4 で実装）。');
      return;
    }
    setWorking(true);
    const pw = d.hasPassword ? await loadPassword(d.id) : null;
    const res = await controller.connect('lan', { name: d.name, model: d.model, host: d.host, port: d.port, password: pw ?? undefined });
    useDevicesStore.getState().setLastUsed(d.id);
    setWorking(false);
    if (res.ok) {
      haptic.success();
      router.back();
    } else {
      setNotice(res.message);
    }
  };

  const connectNew = async () => {
    if (!formValid) return;
    setWorking(true);
    const id = newDeviceId();
    const d: SavedDevice = { id, name: name.trim(), transport: 'lan', host: host.trim(), port: portNum, hasPassword: true };
    await savePassword(id, password);
    useDevicesStore.getState().upsert(d);
    setPassword('');
    setWorking(false);
    await connectSaved(d);
  };

  const removeSaved = (d: SavedDevice) => {
    Alert.alert(`「${d.name}」を削除しますか？`, '保存したパスワードも削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          useDevicesStore.getState().remove(d.id);
          void deletePassword(d.id);
        },
      },
    ]);
  };

  const busy = link in BUSY_TEXT ? BUSY_TEXT[link as keyof typeof BUSY_TEXT] : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
              <AppText variant="body" tone="accent">
                キャンセル
              </AppText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Segmented values={[...ROUTES]} index={route} onChange={setRoute} style={{ height: 34, marginBottom: 20 }} accessibilityLabel="接続経路" />

          {link !== 'idle' && deviceName ? (
            <GroupCard title="現在の接続">
              <ListRow
                title={deviceName}
                subtitle={demo ? 'デモモード' : link === 'online' ? 'オンライン' : (busy ?? 'エラー')}
                right={
                  <Pressable onPress={() => void controller.disconnect('ユーザー操作')} accessibilityRole="button" hitSlop={8}>
                    <AppText variant="body" tone="pgm">
                      切断
                    </AppText>
                  </Pressable>
                }
              />
            </GroupCard>
          ) : null}

          {route === 0 ? (
            <>
              <GroupCard title="保存済みデバイス" footer={saved.length > 0 ? '長押しで削除できます。' : undefined}>
                {saved.length === 0 ? (
                  <View className="px-4 py-3">
                    <AppText variant="footnote" tone="label2">
                      保存済みの機器はありません。下のフォームから追加してください。
                    </AppText>
                  </View>
                ) : (
                  saved.map((d) => (
                    <ListRow
                        key={d.id}
                        icon={d.transport === 'usb' ? 'cable.connector' : d.transport === 'ble' ? 'antenna.radiowaves.left.and.right' : 'wifi'}
                        iconTint={d.id === lastUsedId ? 'accent' : 'gray'}
                        title={d.name}
                        subtitle={d.transport === 'lan' ? `${d.host ?? ''} · LAN` : d.transport === 'usb' ? 'USB' : 'Bluetooth'}
                        subtitleMono
                        checked={d.id === lastUsedId && link === 'online' && !demo}
                        chevron={!(d.id === lastUsedId && link === 'online' && !demo)}
                        onPress={() => void connectSaved(d)}
                        onLongPress={() => removeSaved(d)}
                        accessibilityHint="タップで接続、長押しで削除"
                      />
                  ))
                )}
              </GroupCard>

              <GroupCard title="新規（LAN）" footer="本体 MENU → LAN CONTROL で IP アドレスと NETWORK PASSWORD を確認してください（V-160HD は 4 文字、V-80HD は 8 文字）。">
                <FormField label="名前" value={name} onChange={setName} placeholder="DEMO-SW-C" />
                <FormField label="IP アドレス" value={host} onChange={setHost} placeholder="192.168.0.51" mono keyboard="decimal-pad" />
                <FormField label="ポート" value={port} onChange={setPort} placeholder="8023" mono keyboard="number-pad" />
                <FormField label="パスワード" value={password} onChange={setPassword} placeholder="4 または 8 文字" secure />
              </GroupCard>
            </>
          ) : (
            <GroupCard title={route === 1 ? 'USB' : 'Bluetooth'}>
              <View className="px-4 py-3" style={{ gap: 6 }}>
                <AppText variant="footnote">
                  {route === 1
                    ? 'USB-C ケーブルで本体の USB STREAM 端子と接続します。端点の一覧と再検索は M4 で実装します。'
                    : '本体の Bluetooth を有効にし、「Bluetooth MIDI デバイスを追加」から接続します。M4 で実装します。'}
                </AppText>
                <AppText variant="footnote" tone="warn">
                  V-80HD は現在 LAN のみ対応です。
                </AppText>
              </View>
            </GroupCard>
          )}

          {busy || working ? (
            <View className="mb-3 flex-row items-center justify-center" style={{ gap: 8 }} accessibilityLiveRegion="polite">
              <ActivityIndicator />
              <AppText variant="footnote" tone="warn" mono weight="500">
                {busy ?? '処理中…'}
              </AppText>
            </View>
          ) : null}
          {error ? (
            <AppText variant="footnote" tone="pgm" align="center" className="mb-3" accessibilityLiveRegion="assertive">
              {LINK_ERROR_MESSAGE[error]}
            </AppText>
          ) : null}
          {notice ? (
            <AppText variant="footnote" tone="label2" align="center" className="mb-3" accessibilityLiveRegion="polite">
              {notice}
            </AppText>
          ) : null}

          {route === 0 ? (
            <Pressable
              onPress={() => void connectNew()}
              disabled={!formValid || working}
              accessibilityRole="button"
              accessibilityState={{ disabled: !formValid || working }}
              style={({ pressed }) => ({ opacity: !formValid || working ? 0.4 : pressed ? 0.8 : 1 })}
            >
              <View className="items-center justify-center" style={{ height: 52, borderRadius: 14, backgroundColor: color.accent }}>
                <AppText variant="headline" tone="onTint">
                  接続
                </AppText>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={async () => {
              if (await startDemo()) router.back();
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 12 })}
          >
            <View className="items-center justify-center" style={{ height: 48, borderRadius: radius.card }}>
              <AppText variant="body" tone="accent">
                デモモードで試す
              </AppText>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  secure,
  keyboard = 'default',
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  mono?: boolean;
  secure?: boolean;
  keyboard?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  return (
    <View className="flex-row items-center px-4" style={{ minHeight: 44 }}>
      <AppText variant="body" style={{ width: 110 }}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.label3}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType={secure ? 'password' : 'none'}
        keyboardType={keyboard}
        maxLength={secure ? 8 : undefined}
        accessibilityLabel={label}
        style={{ flex: 1, color: color.label, fontSize: 17, paddingVertical: 11, textAlign: 'right', fontFamily: mono ? font.mono : undefined }}
      />
    </View>
  );
}
