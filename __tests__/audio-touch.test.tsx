import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AudioScreen from '@/app/(tabs)/audio';
import { controller } from '@/core/controller/DeviceController';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: (cb: () => void) => {
    cb();
  },
  useLocalSearchParams: () => ({}),
}));

describe('オーディオ：入力ストリップの操作で例外が出ない（デモ）', () => {
  for (const model of ['V-160HD', 'V-80HD', 'V-1HD', 'VR-4HD', 'V-60HD'] as const) {
    test(model, async () => {
      await act(async () => {
        await controller.connectDemo(model);
      });
      await render(<AudioScreen />);
      const levels = screen.getAllByLabelText(/レベル$/);
      expect(levels.length).toBeGreaterThan(1);
      await act(async () => {
        fireEvent(levels[0]!, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
        fireEvent(levels[0]!, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
        fireEvent(levels[0]!, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
      });
      const mutes = screen.getAllByLabelText(/ミュート$/);
      await act(async () => {
        fireEvent.press(mutes[0]!);
      });
      await act(async () => {
        await controller.disconnect();
      });
    });
  }
});
