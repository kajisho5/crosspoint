import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { decodeAscii8 } from '@/core/codec/value';
import { v160hd } from '@/core/profiles/v160hd';
import { useParamStore } from '@/stores/param';
import { controller } from '@/core/controller/DeviceController';
import SwitcherScreen from '@/app/(tabs)/switcher';
import KeysScreen from '@/app/(tabs)/keys';
import AudioScreen from '@/app/(tabs)/audio';
import MemoryScreen from '@/app/(tabs)/memory';
import MoreScreen from '@/app/(tabs)/more/index';
import ConnectScreen from '@/app/connect';

let mockSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: (cb: () => void) => {
    cb();
  },
  useLocalSearchParams: () => mockSearchParams,
}));
import MenuScreen from '@/app/(tabs)/more/menu/index';
import MenuGroupScreen from '@/app/(tabs)/more/menu/[group]';
import { getCatalog, paramAddr } from '@/core/params';

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

describe('F12 INPUT 設定シート（長押し → 割当・ラベル編集）', () => {
  test('長押しでシートが開き、ラベルと割当を本体（デモ）に書き込める', async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
    await render(<SwitcherScreen />);
    await act(async () => {
      fireEvent(screen.getByLabelText('プログラム 2、CAM 2'), 'longPress');
    });
    expect(screen.getByText('INPUT 2 の設定')).toBeTruthy();
    expect(screen.getByLabelText('ラベル').props.value).toBe('CAM 2');

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('ラベル'), 'STAGE L');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('本体に書き込む'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const v = useParamStore.getState().values;
    const hdmi2 = v160hd.sources.find((s) => s.code === 1)!;
    expect(decodeAscii8(Array.from({ length: 8 }, (_, i) => v[hdmi2.labelAddr! + i] ?? 0x20))).toBe('STAGE L');
    expect(screen.getAllByText('STAGE L')).toHaveLength(2);

    // 割当変更：INPUT 2 を STILL 1（code 16）へ
    await act(async () => {
      fireEvent(screen.getByLabelText('プログラム 2、STAGE L'), 'longPress');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('ソース STILL 1'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('本体に書き込む'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(useParamStore.getState().values[v160hd.addrs.inputAssign(2)]).toBe(16);
  });
});

describe('F13 設定メニュー（全パラメータ）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
  });

  test('メニューにガイドのグループが並ぶ', async () => {
    await render(<MenuScreen />);
    expect(screen.getByText('MIX/WIPE')).toBeTruthy();
    expect(screen.getByText('CAMERA CONTROL')).toBeTruthy();
    expect(screen.getByText('AUDIO INPUT')).toBeTruthy();
  });

  test('MIX/WIPE：値が本体（デモ）から読めて、列挙を変えると書き込まれる', async () => {
    const g = getCatalog('V-160HD').groups.find((x) => x.title === 'MIX/WIPE')!;
    mockSearchParams = { group: g.id };
    await render(<MenuGroupScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(screen.getByText('TRANSITION TYPE')).toBeTruthy();
    expect(screen.getAllByText('MIX').length).toBeGreaterThanOrEqual(1); // デモの初期値（MIX TYPE の値も MIX）
    await act(async () => {
      fireEvent.press(screen.getByLabelText('TRANSITION TYPE、MIX'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('選択肢 WIPE'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[v160hd.addrs.transType]).toBe(1);
  });

  test('CAMERA CONTROL：PTZ パッドが出て、押下で LEFT・解放で STOP を書く', async () => {
    const g = getCatalog('V-160HD').groups.find((x) => x.title === 'CAMERA CONTROL')!;
    mockSearchParams = { group: g.id };
    await render(<MenuGroupScreen />);
    const pan = g.params.find((p) => p.id === 'pan')!;
    const a = paramAddr(pan, g.instances![0]!);
    await act(async () => {
      fireEvent(screen.getByLabelText('パン 左'), 'pressIn');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(useParamStore.getState().values[a]).toBe(0x7f);
    await act(async () => {
      fireEvent(screen.getByLabelText('パン 左'), 'pressOut');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(useParamStore.getState().values[a]).toBe(0);
  });
});
