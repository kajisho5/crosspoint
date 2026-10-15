import { Pressable, View } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import { encodeEnum, paramAddr, type EnumParam, type ParamGroup, type ParamInstance } from '@/core/params';
import { haptic } from '@/lib/haptics';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { GroupCard } from '../ui/GroupCard';

/**
 * CAMERA CONTROL の PTZ パッド（Remote Control Guide：PAN = LEFT/STOP/RIGHT、TILT = DOWN/STOP/UP、
 * ZOOM = WIDE(FAST)/WIDE(SLOW)/STOP/TELE(SLOW)/TELE(FAST)、FOCUS = NEAR/STOP/FAR）。
 * 押している間だけ動かし、離したら STOP を書く（切断・非アクティブ時の解放は controller.releaseAll と同じ考え方）。
 */
export function PtzPad({ group, instance, online }: { group: ParamGroup; instance: ParamInstance | null; online: boolean }) {
  const find = (id: string) => group.params.find((p) => p.id === id && p.kind === 'enum') as EnumParam | undefined;
  const pan = find('pan');
  const tilt = find('tilt');
  const zoom = find('zoom');
  const focus = find('focus');

  const hold = (p: EnumParam | undefined, label: string) => {
    if (!p) return { onPressIn: undefined, onPressOut: undefined, disabled: true };
    const a = paramAddr(p, instance);
    const idx = p.labels.findIndex((l) => l.toUpperCase() === label.toUpperCase());
    const stop = p.labels.findIndex((l) => l.toUpperCase() === 'STOP');
    if (idx < 0 || stop < 0) return { onPressIn: undefined, onPressOut: undefined, disabled: true };
    return {
      disabled: !online,
      onPressIn: () => {
        haptic.select();
        controller.trigger(a, encodeEnum(p, idx));
      },
      onPressOut: () => controller.trigger(a, encodeEnum(p, stop)),
    };
  };

  return (
    <GroupCard title="PTZ（押している間だけ動きます）">
      <View className="px-4 py-3" style={{ gap: 10 }}>
        <View className="flex-row justify-center" style={{ gap: 10 }}>
          <HoldButton label="▲" a11y="チルト 上" {...hold(tilt, 'UP')} />
        </View>
        <View className="flex-row justify-center" style={{ gap: 10 }}>
          <HoldButton label="◀" a11y="パン 左" {...hold(pan, 'LEFT')} />
          <HoldButton label="▶" a11y="パン 右" {...hold(pan, 'RIGHT')} />
        </View>
        <View className="flex-row justify-center" style={{ gap: 10 }}>
          <HoldButton label="▼" a11y="チルト 下" {...hold(tilt, 'DOWN')} />
        </View>
        <View className="flex-row" style={{ gap: 10, marginTop: 6 }}>
          <HoldButton label="WIDE" small a11y="ズーム ワイド" {...hold(zoom, 'WIDE (SLOW)')} />
          <HoldButton label="TELE" small a11y="ズーム テレ" {...hold(zoom, 'TELE (SLOW)')} />
          <HoldButton label="NEAR" small a11y="フォーカス 近" {...hold(focus, 'NEAR')} />
          <HoldButton label="FAR" small a11y="フォーカス 遠" {...hold(focus, 'FAR')} />
        </View>
      </View>
    </GroupCard>
  );
}

function HoldButton({ label, a11y, small, disabled, onPressIn, onPressOut }: { label: string; a11y: string; small?: boolean; disabled?: boolean; onPressIn?: () => void; onPressOut?: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="押している間だけ動きます"
      style={({ pressed }) => ({ flex: small ? 1 : undefined, width: small ? undefined : 72, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <View className="items-center justify-center" style={{ height: 56, borderRadius: radius.card, backgroundColor: color.fill }}>
        <AppText variant="headline">{label}</AppText>
      </View>
    </Pressable>
  );
}
