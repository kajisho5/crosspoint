import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CMD_SEQ_AUTO_QUERY, CMD_SEQ_NEXT, CMD_SEQ_QUERY, cmdMacroExec, cmdSeqAuto, cmdSeqPrev, cmdSeqSw, SIMPLE_COMMANDS_MIN_VERSION } from '@/core/codec/simpleCommands';
import { controller } from '@/core/controller/DeviceController';
import type { Addr } from '@/core/codec/value';
import { useFeature } from '@/lib/features';
import { haptic } from '@/lib/haptics';
import { useConnectionStore } from '@/stores/connection';
import { useLayoutProfile } from '@/stores/selectors';
import { useSimpleStore } from '@/stores/simple';
import { color, radius, xp } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { GroupCard } from '@/components/ui/GroupCard';
import { Screen } from '@/components/ui/Screen';
import { INSET_CARD, useColumnWidth } from '@/components/ui/useColumnWidth';
import { OfflineBanner } from '@/components/status/OfflineBanner';

/**
 * F16 マクロ・シーケンサー。経路は lib/features.ts で決める：
 *  - 'text'：LAN/RS-232 簡易制御コマンド（V-160HD 3.5+ / V-80HD 1.3+ / VR-120HD 2.2+、LAN のみ）
 *      マクロ `MCREX:MACROn;`、シーケンサー `SEQSW:ON/OFF;` `SEQAS:ON/OFF;` `SEQPV;` `SEQPV:1;` `SEQNX;`（状態は QSEQSW / QSEQAS）
 *  - 'sysex'：V-160HD の USB/BLE。マクロは `macroTrigger`（50 05 04 = 番号−1、Companion 由来）、シーケンサーは 0B004F–52 のモーメンタリ
 *  - null  ：出さない（V-80HD / VR-120HD の USB/BLE など）
 * マクロ名の取得アドレス・コマンドは公開資料に無いので番号のみ。
 */
const COLUMNS = 5;

export default function MacroScreen() {
  const profile = useLayoutProfile();
  const online = useConnectionStore((s) => s.link === 'online');
  const transport = useConnectionStore((s) => s.transport);
  const macroRoute = useFeature('macro', profile);
  const seqRoute = useFeature('sequencer', profile);
  const [last, setLast] = useState<number | null>(null);
  const seqOn = useSimpleStore((s) => s.seqOn);
  const seqAuto = useSimpleStore((s) => s.seqAuto);

  useEffect(() => {
    if (online && seqRoute === 'text') {
      controller.sendText(CMD_SEQ_QUERY);
      controller.sendText(CMD_SEQ_AUTO_QUERY);
    }
  }, [online, seqRoute]);

  if (!macroRoute && !seqRoute) {
    const lanOnly = transport === 'usb' || transport === 'ble';
    return (
      <Screen>
        <OfflineBanner />
        <View className="px-4 py-6">
          <AppText variant="body" tone="label2">
            {lanOnly
              ? `${profile.model} のマクロ実行・シーケンサーは LAN 接続時のみ使えます（LAN/RS-232 簡易制御コマンド、本体 Ver.${SIMPLE_COMMANDS_MIN_VERSION[profile.model]} 以降）。`
              : `${profile.model} のマクロ実行・シーケンサーは本体 Ver.${SIMPLE_COMMANDS_MIN_VERSION[profile.model]} 以降の LAN 接続で使えます。`}
          </AppText>
        </View>
      </Screen>
    );
  }

  const seqAddrs = profile.addrs.sequencer;
  const macroAddr = profile.addrs.macroTrigger;
  const rows: number[][] = [];
  for (let n = 1; n <= profile.macroCount; n += COLUMNS) rows.push(Array.from({ length: COLUMNS }, (_, i) => n + i).filter((m) => m <= profile.macroCount));

  const macroWidth = useColumnWidth(COLUMNS, INSET_CARD);
  const w2 = useColumnWidth(2, INSET_CARD, 10);
  const w3 = useColumnWidth(3, INSET_CARD, 10);
  const w4 = useColumnWidth(4, INSET_CARD, 10);

  const runMacro = (n: number) => {
    haptic.impact();
    if (macroRoute === 'text') controller.sendText(cmdMacroExec(n));
    else if (macroAddr != null) controller.trigger(macroAddr, [n - 1]);
    setLast(n);
  };

  return (
    <Screen>
      <OfflineBanner />
      <View className="px-4 pt-3">
        {seqRoute === 'text' ? (
          <GroupCard title="シーケンサー" footer={`LAN 簡易制御コマンドで操作します（本体 Ver.${SIMPLE_COMMANDS_MIN_VERSION[profile.model]} 以降）。状態：${seqOn == null ? '—' : seqOn ? 'ON' : 'OFF'}、Auto Sequence：${seqAuto == null ? '—' : seqAuto ? 'ON' : 'OFF'}`}>
            <View className="px-4 py-3" style={{ gap: 10 }}>
              <View className="flex-row" style={{ gap: 10 }}>
                <TapButton label={seqOn ? 'SEQ OFF' : 'SEQ ON'} active={seqOn === true} disabled={!online} width={w2} accessibilityLabel="シーケンサー ON/OFF" onPress={() => {
                  controller.sendText(cmdSeqSw(!seqOn));
                  controller.sendText(CMD_SEQ_QUERY);
                }} />
                <TapButton label={seqAuto ? 'AUTO OFF' : 'AUTO ON'} active={seqAuto === true} disabled={!online} width={w2} accessibilityLabel="シーケンサー AUTO" onPress={() => {
                  controller.sendText(cmdSeqAuto(!seqAuto));
                  controller.sendText(CMD_SEQ_AUTO_QUERY);
                }} />
              </View>
              <View className="flex-row" style={{ gap: 10 }}>
                <TapButton label="先頭へ" disabled={!online} width={w3} accessibilityLabel="シーケンサー 先頭へ" onPress={() => controller.sendText(cmdSeqPrev(true))} />
                <TapButton label="PREV" disabled={!online} width={w3} accessibilityLabel="シーケンサー PREV" onPress={() => controller.sendText(cmdSeqPrev())} />
                <TapButton label="NEXT" disabled={!online} width={w3} accessibilityLabel="シーケンサー NEXT" onPress={() => controller.sendText(CMD_SEQ_NEXT)} />
              </View>
            </View>
          </GroupCard>
        ) : null}
        {seqRoute === 'sysex' && seqAddrs ? (
          <GroupCard title="シーケンサー" footer="本体のパネルスイッチと同じ動作（押している間 ON）。">
            <View className="flex-row px-4 py-3" style={{ gap: 10 }}>
              <HoldButton label="ON" a={seqAddrs.on} disabled={!online} width={w4} />
              <HoldButton label="AUTO" a={seqAddrs.auto} disabled={!online} width={w4} />
              <HoldButton label="PREV" a={seqAddrs.prev} disabled={!online} width={w4} />
              <HoldButton label="NEXT" a={seqAddrs.next} disabled={!online} width={w4} />
            </View>
          </GroupCard>
        ) : null}

        {macroRoute ? (
          <GroupCard
            title={`マクロ 1–${profile.macroCount}`}
            footer={
              last != null
                ? `最後に実行：マクロ ${last}`
                : macroRoute === 'text'
                  ? `タップで実行（LAN 簡易制御コマンド MCREX、本体 Ver.${SIMPLE_COMMANDS_MIN_VERSION[profile.model]} 以降）。マクロ名は本体から取得できないため番号のみ表示します。`
                  : 'タップで実行します。マクロ名は本体から取得できないため番号のみ表示します。'
            }
          >
            <View className="px-4 py-3" style={{ gap: xp.gap }}>
              {rows.map((row) => (
                <View key={row[0]} className="flex-row" style={{ gap: xp.gap }}>
                  {row.map((n) => (
                    <Pressable
                      key={n}
                      disabled={!online}
                      accessibilityRole="button"
                      accessibilityLabel={`マクロ ${n} を実行`}
                      onPress={() => runMacro(n)}
                      style={({ pressed }) => ({ width: macroWidth, flexGrow: 0, flexShrink: 0, opacity: !online ? 0.4 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                    >
                      <View style={{ width: macroWidth, height: 48, borderRadius: radius.xp, backgroundColor: last === n ? color.accent : color.fill, justifyContent: 'center', alignItems: 'center' }}>
                        <AppText variant="body" weight="600" mono tone={last === n ? 'onTint' : 'label'}>
                          {n}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </GroupCard>
        ) : null}
      </View>
    </Screen>
  );
}

function TapButton({ label, active, disabled, accessibilityLabel, width, onPress }: { label: string; active?: boolean; disabled: boolean; accessibilityLabel: string; width: number; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active, disabled }}
      onPress={() => {
        haptic.impact();
        onPress();
      }}
      style={({ pressed }) => ({ width, flexGrow: 0, flexShrink: 0, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <View className="items-center justify-center" style={{ width, height: 56, borderRadius: radius.card, backgroundColor: active ? color.accent : color.fill }}>
        <AppText variant="body" weight="600" tone={active ? 'onTint' : 'label'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

function HoldButton({ label, a, disabled, width }: { label: string; a: Addr; disabled: boolean; width: number }) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`シーケンサー ${label}`}
      onPressIn={() => {
        setDown(true);
        haptic.impact();
        controller.press(a);
      }}
      onPressOut={() => {
        setDown(false);
        controller.release(a);
      }}
      style={{ width, flexGrow: 0, flexShrink: 0, opacity: disabled ? 0.4 : 1 }}
    >
      <View className="items-center justify-center" style={{ width, height: 56, borderRadius: radius.card, backgroundColor: down ? color.accent : color.fill }}>
        <AppText variant="body" weight="600" tone={down ? 'onTint' : 'label'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
