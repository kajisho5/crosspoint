import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { addr } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { color, radius } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { Screen } from '@/components/ui/Screen';
import { INSET_CARD, useColumnWidth } from '@/components/ui/useColumnWidth';
import { OfflineBanner } from '@/components/status/OfflineBanner';

// V-160HD Remote Control Guide eng06: Button Control.
const CAPTURE_IMAGE = addr(0x0b, 0x00, 0x28);
const CUT = addr(0x0b, 0x00, 0x1e);
const AUTO = addr(0x0b, 0x00, 0x1f);
const SUB_PROGRAM = addr(0x0b, 0x00, 0x09);

type CaptureStage = 'closed' | 'confirm-screen' | 'target' | 'source' | 'captured';
type CaptureSource = { label: string; addr: number };

const SDI_SOURCES: CaptureSource[] = Array.from({ length: 8 }, (_, i) => ({ label: `SDI IN ${i + 1}`, addr: i }));
const HDMI_SOURCES: CaptureSource[] = Array.from({ length: 8 }, (_, i) => ({ label: `HDMI IN ${i + 1}`, addr: i + 0x0a }));
const OUTPUT_SOURCES: CaptureSource[] = [
  { label: 'PROGRAM', addr: CUT },
  { label: 'PREVIEW', addr: AUTO },
  { label: 'SUB PROGRAM', addr: SUB_PROGRAM },
];

export default function StillScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const supported = profile.model === 'V-160HD';
  const [stage, setStage] = useState<CaptureStage>('closed');
  const [target, setTarget] = useState<number | null>(null);
  const width = useColumnWidth(4, INSET_CARD, 10);

  const openCapture = () => {
    Alert.alert(
      '静止画キャプチャを開始',
      'CAPTURE IMAGE画面を開きます。本体画面で保存先と取り込み元を選びます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '開始',
          onPress: () => {
            haptic.impact();
            controller.tap(CAPTURE_IMAGE);
            setTarget(null);
            setStage('confirm-screen');
          },
        },
      ],
    );
  };

  const chooseTarget = (slot: number) => {
    // In the confirmed CAPTURE IMAGE screen, the cross-point keys choose a still slot.
    // The same keys select PGM/PST sources outside that screen, so require an explicit
    // on-device screen confirmation before enabling them.
    controller.tap(addr(0x0b, 0x00, slot < 9 ? slot - 1 : slot + 1));
    setTarget(slot);
    setStage('source');
  };

  const chooseSource = (source: CaptureSource) => {
    // The Remote Control Guide maps these keys to image-source selection while
    // CAPTURE IMAGE is open; selecting a source starts the capture immediately.
    controller.tap(source.addr);
    setStage('captured');
  };

  const finish = () => {
    Alert.alert(
      'キャプチャを終了',
      '本体側に COMPLETE と表示されていることを確認してから終了してください。',
      [
        { text: '戻る', style: 'cancel' },
        {
          text: '終了',
          onPress: () => {
            haptic.impact();
            controller.tap(CAPTURE_IMAGE);
            setStage('closed');
            setTarget(null);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3" style={{ gap: 12 }}>
        <GroupCard title="静止画キャプチャ" footer="保存先と取り込み元のボタン割当はV-160HD Reference Manualに準拠します。画像一覧・USBメモリーとの読込／保存・名前編集・削除は別機能です。">
          {supported ? (
            <View className="px-4 py-4" style={{ gap: 12 }}>
              {stage === 'closed' ? (
                <>
                  <AppText variant="footnote" tone="label2">
                    開始後、本体に CAPTURE IMAGE 画面が表示されたことを確認してから、保存先と取り込み元を選んでください。確認前は入力選択ボタンを送信しません。
                  </AppText>
                  <ActionButton label="CAPTURE IMAGE画面を開く" disabled={!online} onPress={openCapture} />
                </>
              ) : null}

              {stage === 'confirm-screen' ? (
                <>
                  <AppText variant="body" tone="label">
                    本体画面に「CAPTURE IMAGE SELECT TARGET STORAGE」が表示されていますか？ 表示中だけ次へ進んでください。
                  </AppText>
                  <View className="flex-row" style={{ gap: 10 }}>
                    <ActionButton label="画面を確認した" disabled={!online} onPress={() => setStage('target')} />
                    <ActionButton label="アプリの操作をやめる" disabled={false} secondary horizontal onPress={() => setStage('closed')} />
                  </View>
                </>
              ) : null}

              {stage === 'target' ? (
                <>
                  <AppText variant="body" tone="label">保存先スチルを選択</AppText>
                  <AppText variant="footnote" tone="label2">本体がCAPTURE IMAGE画面のままであることを確認してください。</AppText>
                  <NumberGrid start={1} end={8} width={width} disabled={!online} onSelect={chooseTarget} />
                  <NumberGrid start={9} end={16} width={width} disabled={!online} onSelect={chooseTarget} />
                  <AppText variant="footnote" tone="label2">操作を中止するとアプリの選択画面を閉じます。本体のCAPTURE IMAGE画面はそのままなので、本体の操作で終了してください。</AppText>
                  <ActionButton label="アプリの操作をやめる" disabled={false} secondary onPress={() => setStage('closed')} />
                </>
              ) : null}

              {stage === 'source' ? (
                <>
                  <AppText variant="body" tone="label">取り込み元を選択</AppText>
                  <AppText variant="footnote" tone="label2">保存先：STILL {target}。入力を選ぶとキャプチャが始まります。</AppText>
                  <SourceGrid title="SDI入力" sources={SDI_SOURCES} width={width} disabled={!online} onSelect={chooseSource} />
                  <SourceGrid title="HDMI入力" sources={HDMI_SOURCES} width={width} disabled={!online} onSelect={chooseSource} />
                  <SourceGrid title="出力バス" sources={OUTPUT_SOURCES} width={width} disabled={!online} onSelect={chooseSource} />
                  <AppText variant="footnote" tone="label2">操作を中止するとアプリの選択画面を閉じます。本体のCAPTURE IMAGE画面はそのままなので、本体の操作で終了してください。</AppText>
                  <ActionButton label="アプリの操作をやめる" disabled={false} secondary onPress={() => setStage('closed')} />
                </>
              ) : null}

              {stage === 'captured' ? (
                <>
                  <AppText variant="body" tone="label">STILL {target} のキャプチャを実行しました。</AppText>
                  <AppText variant="footnote" tone="label2">本体に COMPLETE と表示されたことを確認してから終了してください。</AppText>
                  <ActionButton label="COMPLETEを確認して終了" disabled={!online} onPress={finish} />
                </>
              ) : null}
            </View>
          ) : (
            <View className="px-4 py-4">
              <AppText variant="body" tone="label2">{profile.model} の静止画キャプチャ操作は、現在の公開仕様マップで確認できません。</AppText>
            </View>
          )}
        </GroupCard>
      </View>
    </Screen>
  );
}

function NumberGrid({ start, end, width, disabled, onSelect }: { start: number; end: number; width: number; disabled: boolean; onSelect: (slot: number) => void }) {
  const values = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {values.map((slot) => (
        <Pressable key={slot} disabled={disabled} accessibilityRole="button" accessibilityLabel={`STILL ${slot}を保存先にする`} onPress={() => onSelect(slot)} style={({ pressed }) => ({ width, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
          <View className="items-center justify-center" style={{ height: 48, borderRadius: radius.xp, backgroundColor: color.fill }}>
            <AppText variant="body" weight="600" mono tone="label">{slot}</AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function SourceGrid({ title, sources, width, disabled, onSelect }: { title: string; sources: CaptureSource[]; width: number; disabled: boolean; onSelect: (source: CaptureSource) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="footnote" tone="label2" weight="500">{title}</AppText>
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {sources.map((source) => (
          <Pressable key={source.label} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${source.label}からキャプチャ`} onPress={() => onSelect(source)} style={({ pressed }) => ({ width, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
            <View className="items-center justify-center" style={{ height: 48, borderRadius: radius.xp, backgroundColor: color.fill }}>
              <AppText variant="footnote" weight="600" tone="label">{source.label}</AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ActionButton({ label, disabled, secondary, horizontal, onPress }: { label: string; disabled: boolean; secondary?: boolean; horizontal?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={() => { haptic.impact(); onPress(); }} style={({ pressed }) => ({ minHeight: 56, alignSelf: 'stretch', flexGrow: horizontal ? 1 : 0, flexBasis: horizontal ? 0 : 'auto', opacity: disabled ? 0.4 : pressed ? 0.75 : 1 })}>
      <View className="items-center justify-center px-3" style={{ minHeight: 56, borderRadius: radius.card, backgroundColor: secondary ? color.fill : color.accent }}>
        <AppText variant="body" weight="600" tone={secondary ? 'label' : 'onTint'}>{label}</AppText>
      </View>
    </Pressable>
  );
}
