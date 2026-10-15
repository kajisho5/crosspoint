import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { controller } from '@/core/controller/DeviceController';
import type { ModelId } from '@/core/profiles/types';
import { haptic } from './haptics';

const MODELS: ModelId[] = ['V-160HD', 'V-80HD', 'VR-120HD'];

/** F11 デモモードの機種を選んで開始（キャンセル時は false） */
export function startDemo(): Promise<boolean> {
  return new Promise((resolve) => {
    const run = async (model: ModelId) => {
      await controller.connectDemo(model);
      haptic.success();
      resolve(true);
    };
    const title = 'デモモード';
    const message = '実機に接続せず、架空の機器（DEMO-SW-A）で全画面を操作できます。';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: [...MODELS, 'キャンセル'], cancelButtonIndex: MODELS.length },
        (i) => {
          const m = MODELS[i];
          if (m) void run(m);
          else resolve(false);
        },
      );
      return;
    }
    Alert.alert(title, message, [
      ...MODELS.map((m) => ({ text: m, onPress: () => void run(m) })),
      { text: 'キャンセル', style: 'cancel' as const, onPress: () => resolve(false) },
    ]);
  });
}
