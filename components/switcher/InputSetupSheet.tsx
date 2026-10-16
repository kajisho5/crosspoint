import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { encodeAscii8 } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import type { DeviceProfile } from '@/core/profiles/types';
import { haptic } from '@/lib/haptics';
import { assignedSource, labelOfSource } from '@/stores/selectors';
import { useParamStore } from '@/stores/param';
import { color, font, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { GroupCard } from '../ui/GroupCard';
import { ListRow } from '../ui/ListRow';

/**
 * INPUT n の設定シート（F12）：割当ソースの変更（`input.assign`、SPEC §9-1）と、
 * そのソースの 8 文字ラベル（`label.*`、マルチビュー表示名）の編集。
 * ラベルは「INPUT」ではなく「物理ソース（HDMI/SDI/STILL）」に付く本体側の値なので、同じソースを割り当てた他の INPUT にも反映される。
 */

export const LABEL_MAX = 8;
const ASCII_RE = /^[\x20-\x7e]*$/;

export interface InputSetupSheetProps {
  profile: DeviceProfile;
  /** 対象 INPUT（1 始まり）。null で非表示 */
  n: number | null;
  onClose: () => void;
}

export function InputSetupSheet({ profile, n, onClose }: InputSetupSheetProps) {
  const visible = n != null;
  const currentCode = useParamStore((s) => (n == null ? undefined : assignedSource(profile, s.values, n)));
  const values = useParamStore((s) => s.values);

  const [code, setCode] = useState<number | null>(null);
  const [label, setLabel] = useState('');

  // 開くたびに本体の現在値で初期化
  useEffect(() => {
    if (!visible) return;
    const c = currentCode ?? null;
    setCode(c);
    setLabel(c == null ? '' : storedLabel(profile, values, c));
    // values は開いた瞬間の値だけ使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, n]);

  const selectedSource = useMemo(() => profile.sources.find((s) => s.code === code) ?? null, [profile, code]);
  const labelEditable = selectedSource?.labelAddr != null;
  const labelValid = ASCII_RE.test(label) && label.length <= LABEL_MAX;
  const originalLabel = code == null ? '' : storedLabel(profile, values, code);
  const changed = code !== (currentCode ?? null) || (labelEditable && label.trim() !== originalLabel.trim());
  const canSave = n != null && code != null && labelValid && changed;

  const save = () => {
    if (!canSave || n == null || code == null) return;
    if (code !== currentCode) {
      const v = profile.sourceToAssign(n, code);
      if (v != null && profile.addrs.inputAssign != null) controller.write(profile.addrs.inputAssign(n), [v]);
    }
    if (labelEditable && selectedSource?.labelAddr != null && label.trim() !== originalLabel.trim()) {
      controller.write(selectedSource.labelAddr, encodeAscii8(label));
    }
    haptic.success();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <View className="flex-row items-center justify-between px-4" style={{ height: 56 }}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <AppText variant="body" tone="accent">
              キャンセル
            </AppText>
          </Pressable>
          <AppText variant="headline">{n != null ? `INPUT ${n} の設定` : ''}</AppText>
          <Pressable onPress={save} disabled={!canSave} accessibilityRole="button" accessibilityState={{ disabled: !canSave }} hitSlop={10}>
            <AppText variant="body" weight="600" tone="accent" style={{ opacity: canSave ? 1 : 0.4 }}>
              保存
            </AppText>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <GroupCard
            title="ラベル（半角 8 文字）"
            footer={
              labelEditable
                ? 'マルチビューに表示される名前です。ソース（HDMI / SDI / STILL）に付くため、同じソースを割り当てた他の INPUT にも反映されます。'
                : 'このソースにはラベルがありません。'
            }
          >
            <View className="flex-row items-center px-4" style={{ minHeight: 44 }}>
              <AppText variant="body" style={{ width: 110 }}>
                {selectedSource?.name ?? '—'}
              </AppText>
              <TextInput
                value={label}
                onChangeText={(t) => setLabel(t.slice(0, LABEL_MAX))}
                editable={labelEditable}
                placeholder={selectedSource?.name ?? ''}
                placeholderTextColor={color.label3}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={LABEL_MAX}
                accessibilityLabel="ラベル"
                style={{ flex: 1, color: labelEditable ? color.label : color.label3, fontSize: 17, paddingVertical: 11, textAlign: 'right', fontFamily: font.mono }}
              />
            </View>
            {!labelValid ? (
              <View className="px-4 pb-2">
                <AppText variant="footnote" tone="pgm">
                  半角英数記号のみ、8 文字までです。
                </AppText>
              </View>
            ) : null}
          </GroupCard>

          <GroupCard title="割当ソース" footer="INPUT ASSIGN。本体の MENU と同じ設定です。">
            {profile.sources.filter((s) => n == null || profile.sourceToAssign(n, s.code) != null).map((s) => (
              <ListRow
                key={s.code}
                title={s.name}
                accessibilityLabel={`ソース ${s.name}`}
                subtitle={labelOfSource(profile, values, s.code) !== s.name ? labelOfSource(profile, values, s.code) : undefined}
                subtitleMono
                checked={code === s.code}
                onPress={() => {
                  setCode(s.code);
                  setLabel(storedLabel(profile, values, s.code));
                }}
              />
            ))}
          </GroupCard>

          <Pressable onPress={save} disabled={!canSave} accessibilityRole="button" style={({ pressed }) => ({ opacity: !canSave ? 0.4 : pressed ? 0.8 : 1 })}>
            <View className="items-center justify-center" style={{ height: 52, borderRadius: radius.card, backgroundColor: color.accent }}>
              <AppText variant="headline" tone="onTint">
                本体に書き込む
              </AppText>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 本体から読んだラベル（未受信・空ならソース名ではなく空文字） */
function storedLabel(profile: DeviceProfile, values: Record<number, number>, code: number): string {
  const name = labelOfSource(profile, values, code);
  const src = profile.sources.find((s) => s.code === code);
  return name === src?.name ? '' : name;
}
