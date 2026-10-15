import { useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import {
  decodeParam,
  encodeEnum,
  encodeInt,
  encodeIntZero,
  encodeLevelDb,
  encodeText,
  formatInt,
  paramAddr,
  type EnumParam,
  type IntParam,
  type LevelParam,
  type ParamDef,
  type ParamInstance,
  type TextParam,
} from '@/core/params';
import { haptic } from '@/lib/haptics';
import { useBytes } from '@/stores/param';
import { color, font } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { ListRow } from '../ui/ListRow';
import { NumberSheet } from './NumberSheet';
import { PickerSheet } from './PickerSheet';

/**
 * パラメータ 1 行（Remote Control Guide の 1 項目）。種別ごとの操作部品：
 *  bool → Switch / enum → 選択シート / int・level → 数値シート / text → 入力欄（確定で書込み）
 *  exec（書くと実行）→ 選択して即送信（楽観更新なし）/ readOnly → 表示のみ
 */
export function ParamRow({ p, instance, online }: { p: ParamDef; instance: ParamInstance | null; online: boolean }) {
  const a = paramAddr(p, instance);
  const bytes = useBytes(p.writeOnly ? null : a, p.size);
  const value = bytes ? decodeParam(p, bytes) : null;
  const [open, setOpen] = useState(false);
  const disabled = !online || !!p.readOnly;
  const hint = p.readOnly ? '読取専用' : undefined;

  switch (p.kind) {
    case 'bool':
      return (
        <ListRow
          title={p.name}
          subtitle={hint}
          right={
            <Switch
              value={value?.kind === 'bool' ? value.on : false}
              disabled={disabled || value == null}
              onValueChange={(on) => {
                haptic.select();
                controller.write(a, [on ? 1 : 0]);
              }}
              accessibilityLabel={p.name}
            />
          }
        />
      );
    case 'enum': {
      const ep = p as EnumParam;
      const label = value?.kind === 'enum' ? value.label : '—';
      const selected = value?.kind === 'enum' ? value.index : -1;
      return (
        <>
          <ListRow
            title={p.name}
            subtitle={p.exec ? '選ぶと実行' : hint}
            value={p.exec ? undefined : label}
            chevron={!disabled}
            disabled={disabled}
            onPress={() => setOpen(true)}
          />
          <PickerSheet
            title={p.name}
            options={ep.labels}
            selectedIndex={p.exec ? -1 : selected}
            visible={open}
            onClose={() => setOpen(false)}
            onSelect={(i) => {
              haptic.select();
              if (p.exec || p.writeOnly) controller.trigger(a, encodeEnum(ep, i));
              else controller.write(a, encodeEnum(ep, i));
            }}
          />
        </>
      );
    }
    case 'int': {
      const ip = p as IntParam;
      const text = value?.kind === 'int' ? value.text : '—';
      const cur = value?.kind === 'int' && !value.isZeroLabel ? value.value : Math.min(ip.max, Math.max(ip.min, 0));
      return (
        <>
          <ListRow title={p.name} subtitle={hint} value={text} valueMono chevron={!disabled} disabled={disabled} onPress={() => setOpen(true)} />
          <NumberSheet
            title={p.name}
            visible={open}
            value={cur}
            min={ip.min}
            max={ip.max}
            step={ip.scale}
            format={(v) => formatInt(ip, v)}
            special={ip.zeroLabel}
            isSpecial={value?.kind === 'int' && value.isZeroLabel}
            onChange={(v) => controller.write(a, encodeInt(ip, v))}
            onSpecial={ip.zeroLabel != null ? () => controller.write(a, encodeIntZero(ip)) : undefined}
            onClose={() => setOpen(false)}
          />
        </>
      );
    }
    case 'level': {
      const lp = p as LevelParam;
      const text = value?.kind === 'level' ? value.text : '—';
      const cur = value?.kind === 'level' && value.db != null ? value.db : lp.min;
      return (
        <>
          <ListRow title={p.name} subtitle={hint} value={text} valueMono chevron={!disabled} disabled={disabled} onPress={() => setOpen(true)} />
          <NumberSheet
            title={p.name}
            visible={open}
            value={cur}
            min={lp.min}
            max={lp.max}
            step={lp.scale}
            format={(v) => `${v.toFixed(1)} dB`}
            special="−INF"
            isSpecial={value?.kind === 'level' && value.db === null}
            onChange={(v) => controller.write(a, encodeLevelDb(v))}
            onSpecial={() => controller.write(a, encodeLevelDb(null))}
            onClose={() => setOpen(false)}
          />
        </>
      );
    }
    case 'text':
      return <TextParamRow p={p as TextParam} addr={a} current={value?.kind === 'text' ? value.text : ''} loaded={value != null} disabled={disabled} />;
    default:
      return <ListRow title={p.name} subtitle={`${p.sysex}（未対応の形式）`} value={value?.kind === 'unknown' ? value.hex : '—'} valueMono />;
  }
}

function TextParamRow({ p, addr, current, loaded, disabled }: { p: TextParam; addr: number; current: string; loaded: boolean; disabled: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? current;
  const dirty = draft != null && draft.trim() !== current.trim();
  return (
    <View className="flex-row items-center px-4" style={{ minHeight: 44 }}>
      <AppText variant="body" style={{ width: 120 }}>
        {p.name}
      </AppText>
      <TextInput
        value={shown}
        editable={!disabled && loaded}
        onChangeText={(t) => setDraft(t.slice(0, p.size))}
        onBlur={() => {
          if (dirty) {
            controller.write(addr, encodeText(draft ?? '', p.size));
            haptic.success();
          }
          setDraft(null);
        }}
        placeholder={loaded ? `${p.size} 文字まで` : '—'}
        placeholderTextColor={color.label3}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        maxLength={p.size}
        returnKeyType="done"
        accessibilityLabel={p.name}
        style={{ flex: 1, color: disabled ? color.label3 : color.label, fontSize: 17, paddingVertical: 11, textAlign: 'right', fontFamily: font.mono }}
      />
    </View>
  );
}
