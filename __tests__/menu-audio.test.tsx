import { act, render } from '@testing-library/react-native';
import { controller } from '@/core/controller/DeviceController';
import { getCatalog } from '@/core/params';
import { PROFILES } from '@/core/profiles';

let mockSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: (cb: () => void) => {
    cb();
  },
  useLocalSearchParams: () => mockSearchParams,
}));
import MenuGroupScreen from '@/app/(tabs)/more/menu/[group]';

describe('メニュー：全グループがデモで描画できる（例外＝実機でクラッシュ）', () => {
  for (const model of Object.keys(PROFILES) as (keyof typeof PROFILES)[]) {
    const groups = getCatalog(model).groups;
    if (groups.length === 0) continue;
    test(model, async () => {
      await act(async () => {
        await controller.connectDemo(model);
      });
      for (const g of groups) {
        mockSearchParams = { group: g.id };
        const r = await render(<MenuGroupScreen />);
        await act(async () => {
          await new Promise((res) => setTimeout(res, 30));
        });
        r.toJSON();
        r.unmount();
      }
      await act(async () => {
        await controller.disconnect();
      });
    });
  }
});
