import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { addrToHex, hexToAddr, type Addr } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { parseHexBytes } from '@/lib/format';
import { useLogStore } from '@/stores/log';
import { useOnline } from '@/stores/selectors';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { color, font, radius } from '@/theme/tokens';

function parseAddr(text: string): Addr | null {
  try {
    return hexToAddr(text.trim().toUpperCase());
  } catch {
    return null;
  }
}

/** F10 任意書込み（DTH/DT1）とアドレス読取り（RQH/RQ1）。書込みは楽観更新しない（trigger） */
export default function ConsoleScreen() {
  const online = useOnline();
  const [wAddr, setWAddr] = useState('');
  const [wData, setWData] = useState('');
  const [rAddr, setRAddr] = useState('');
  const [rSize, setRSize] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  const recent = useLogStore(useShallow((s) => s.lines.slice(-12)));

  const doWrite = () => {
    const a = parseAddr(wAddr);
    const bytes = parseHexBytes(wData);
    if (a == null) return setMsg('アドレスは 6 桁の 16 進（各バイト 00–7F）で入力してください。');
    if (bytes == null) return setMsg('データは 16 進のバイト列（各 00–7F）で入力してください。');
    controller.trigger(a, bytes);
    setMsg(`書込み ${addrToHex(a)} ← ${bytes.length} byte`);
  };

  const doRead = () => {
    const a = parseAddr(rAddr);
    const size = parseInt(rSize, 10);
    if (a == null) return setMsg('アドレスは 6 桁の 16 進（各バイト 00–7F）で入力してください。');
    if (!Number.isInteger(size) || size < 1 || size > 128) return setMsg('サイズは 1–128 で入力してください。');
    controller.read(a, size);
    setMsg(`読取り ${addrToHex(a)} × ${size}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
      {!online ? (
        <AppText variant="footnote" tone="warn" className="mb-3">
          未接続のため送信できません。
        </AppText>
      ) : null}
      <GroupCard title="書込み（DTH / DT1）" footer="例：アドレス 002100、データ 20 → PGM を INPUT 1 に（V-160HD・logical20）">
        <Field label="アドレス" value={wAddr} onChange={setWAddr} placeholder="002100" />
        <Field label="データ" value={wData} onChange={setWData} placeholder="20" />
        <ActionButton label="送信" onPress={doWrite} disabled={!online} />
      </GroupCard>
      <GroupCard title="読取り（RQH / RQ1）">
        <Field label="アドレス" value={rAddr} onChange={setRAddr} placeholder="0C0000" />
        <Field label="サイズ" value={rSize} onChange={setRSize} placeholder="1" numeric />
        <ActionButton label="読取り" onPress={doRead} disabled={!online} />
      </GroupCard>
      {msg ? (
        <AppText variant="footnote" tone="label2" mono className="mb-4 px-4">
          {msg}
        </AppText>
      ) : null}
      <GroupCard title="直近のログ">
        <View className="px-4 py-2">
          {recent.length === 0 ? (
            <AppText variant="caption" tone="label2">
              なし
            </AppText>
          ) : (
            recent.map((l) => (
              <AppText key={l.id} variant="caption2" mono tone={l.dir === 'rx' ? 'pst' : l.dir === 'tx' ? 'accent' : 'label2'} selectable>
                {`${l.dir === 'tx' ? '→' : l.dir === 'rx' ? '←' : '·'} ${l.text}`}
              </AppText>
            ))
          )}
        </View>
      </GroupCard>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, numeric }: { label: string; value: string; onChange: (s: string) => void; placeholder: string; numeric?: boolean }) {
  return (
    <View className="flex-row items-center px-4" style={{ minHeight: 44 }}>
      <AppText variant="body" style={{ width: 88 }}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.label3}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        keyboardType={numeric ? 'number-pad' : 'ascii-capable'}
        accessibilityLabel={label}
        style={{ flex: 1, color: color.label, fontFamily: font.mono, fontSize: 17, paddingVertical: 10, textAlign: 'right' }}
      />
    </View>
  );
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      <View className="items-center justify-center" style={{ minHeight: 44, borderRadius: radius.card }}>
        <AppText variant="body" tone="accent" weight="600">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
