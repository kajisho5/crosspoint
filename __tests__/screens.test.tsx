import { act, render, screen } from '@testing-library/react-native';
import { controller } from '@/core/controller/DeviceController';
import SwitcherScreen from '@/app/(tabs)/switcher';
import KeysScreen from '@/app/(tabs)/keys';
import AudioScreen from '@/app/(tabs)/audio';
import MemoryScreen from '@/app/(tabs)/memory';
import MoreScreen from '@/app/(tabs)/more/index';
import ConnectScreen from '@/app/connect';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  Stack: { Screen: () => null },
}));

afterEach(async () => {
  await act(async () => {
    await controller.disconnect();
  });
});

describe('未接続', () => {
  test('スイッチャーは未接続バナーと V-160HD の枠を出す', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('未接続です。タップして接続してください。')).toBeTruthy();
    expect(screen.getByText('V-160HD')).toBeTruthy();
    expect(screen.getAllByText('INPUT 1')).toHaveLength(2);
  });
});

describe('デモ V-160HD（ボード S1〜S5 のダミー値）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
  });

  test('S1：ラベル・FW・CUT/AUTO・TIME', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('DEMO-SW-A')).toBeTruthy();
    expect(screen.getByText('FW 3.60')).toBeTruthy();
    expect(screen.getAllByText('CAM 1')).toHaveLength(2);
    expect(screen.getAllByText('STILL 2')).toHaveLength(2);
    expect(screen.getByText('CUT')).toBeTruthy();
    expect(screen.getByText('AUTO')).toBeTruthy();
    expect(screen.getAllByText('1.0s').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('プログラム 1、CAM 1、選択中')).toBeTruthy();
    expect(screen.getByLabelText('プログラム 3、CAM 3、プリセット中')).toBeTruthy();
  });

  test('S2：PinP & KEY 4 系統・DSK 2・SPLIT 2', async () => {
    await render(<KeysScreen />);
    expect(screen.getByText('PinP & KEY 4')).toBeTruthy();
    expect(screen.getByText('DSK 2')).toBeTruthy();
    expect(screen.getByText('SPLIT 2')).toBeTruthy();
    expect(screen.getByText('CAM 2 · 0.5s')).toBeTruthy();
    expect(screen.getByText('STILL 2 · LUM-WHITE · 1.0s')).toBeTruthy();
  });

  test('S3：dB 表示と MAIN', async () => {
    await render(<AudioScreen />);
    expect(screen.getByText('MAIN')).toBeTruthy();
    expect(screen.getByText('−6.0')).toBeTruthy();
    expect(screen.getByText('−INF')).toBeTruthy();
    expect(screen.getByText('−2.0')).toBeTruthy();
  });

  test('S4：現在 MEM 07・30 枠', async () => {
    await render(<MemoryScreen />);
    expect(screen.getByText('MEM 07')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.queryByText('31')).toBeNull();
  });

  test('S5：デモ表示', async () => {
    await render(<MoreScreen />);
    expect(screen.getByText('デモモード')).toBeTruthy();
    expect(screen.getAllByLabelText('デモモード').length).toBeGreaterThan(0);
  });

  test('S0：現在の接続', async () => {
    await render(<ConnectScreen />);
    expect(screen.getByText('現在の接続')).toBeTruthy();
    expect(screen.getByText('保存済みの機器はありません。下のフォームから追加してください。')).toBeTruthy();
  });
});

describe('デモ V-80HD（SPEC §9-5 の出し分け）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('V-80HD');
    });
  });

  test('CUT/AUTO を置かず、4 列・バンク 1–8', async () => {
    await render(<SwitcherScreen />);
    expect(screen.queryByText('CUT')).toBeNull();
    expect(screen.queryByText('AUTO')).toBeNull();
    expect(screen.getByText('CUT / AUTO')).toBeTruthy();
    expect(screen.getAllByLabelText(/^プログラム \d+、/)).toHaveLength(8);
  });

  test('キーは PinP 2・DSK 1', async () => {
    await render(<KeysScreen />);
    expect(screen.getByText('PinP & KEY 2')).toBeTruthy();
    expect(screen.queryByText('PinP & KEY 3')).toBeNull();
    expect(screen.getAllByText('DSK')).toHaveLength(2);
  });

  test('シーン 32 件', async () => {
    await render(<MemoryScreen />);
    expect(screen.getByText('シーン')).toBeTruthy();
    expect(screen.getByText('SCENE 07')).toBeTruthy();
    expect(screen.getByText('32')).toBeTruthy();
  });
});
