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
import QuickScreen from '@/app/(tabs)/more/quick';
import AuxScreen from '@/app/(tabs)/more/aux';
import MacroScreen from '@/app/(tabs)/more/macro';
import { useLogStore } from '@/stores/log';
import { useSimpleStore } from '@/stores/simple';
import { v80hd as v80hdProfile } from '@/core/profiles/v80hd';
import { Alert } from 'react-native';
import { addr } from '@/core/codec/value';
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

  test('CUT/AUTO は簡易制御コマンド（CUT; / ATO;）で動く、4 列・バンク 1–8', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('CUT')).toBeTruthy();
    expect(screen.getByText('タップで切替')).toBeTruthy();
    expect(screen.getAllByLabelText(/^プログラム \d+、/)).toHaveLength(8);
    const pgm = useParamStore.getState().values[v80hdProfile.addrs.pgm];
    const pst = useParamStore.getState().values[v80hdProfile.addrs.pst];
    await act(async () => {
      fireEvent(screen.getByLabelText('カット'), 'pressIn');
      fireEvent(screen.getByLabelText('カット'), 'pressOut');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    const tx = useLogStore.getState().lines.filter((l) => l.dir === 'tx').map((l) => l.text);
    expect(tx).toContain('CUT;');
    expect(useParamStore.getState().values[v80hdProfile.addrs.pgm]).toBe(pst);
    expect(useParamStore.getState().values[v80hdProfile.addrs.pst]).toBe(pgm);
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

describe('F14 クイック操作', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
  });

  test('HDMI OUT 3 を PREVIEW / MULTI-VIEW に切り替えると 00 00 0C に書かれる', async () => {
    await render(<QuickScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('HDMI OUT 3 を PREVIEW に'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[addr(0x00, 0x00, 0x0c)]).toBe(2);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('HDMI OUT 3 を MULTI-VIEW に'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[addr(0x00, 0x00, 0x0c)]).toBe(8);
    expect(screen.getByText(/現在：MULTI-VIEW/)).toBeTruthy();
  });

  test('一括設定：確認で「実行」すると 16 系統の DIGITAL GAIN / MONO と SDI OUT 1–3 の LEVEL-A が書かれる', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const run = buttons?.find((b) => b.text === '実行');
      run?.onPress?.();
    });
    await render(<QuickScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('HDMI/SDI 入力音声を −16.8 dB・LR MIX に'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('SDI OUT をすべて LEVEL-A に'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    const v = useParamStore.getState().values;
    // HDMI IN 1（xx 05H）・SDI IN 8（xx 14H）
    expect([v[addr(0x01, 0x05, 0x01)], v[addr(0x01, 0x05, 0x02)]]).toEqual([0x7e, 0x58]);
    expect(v[addr(0x01, 0x05, 0x0a)]).toBe(3);
    expect([v[addr(0x01, 0x14, 0x01)], v[addr(0x01, 0x14, 0x02)]]).toEqual([0x7e, 0x58]);
    expect(v[addr(0x01, 0x14, 0x0a)]).toBe(3);
    expect(v[addr(0x00, 0x14, 0x00)]).toBe(0);
    expect(v[addr(0x00, 0x16, 0x00)]).toBe(0);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe('F15 AUX モード', () => {
  test('V-160HD：ソースボタンを押すと AUX SOURCE（00 00 11）に書かれ、選択中になる', async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
    await render(<AuxScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(screen.getByText('AUX 1 ソース')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^AUX 1 SDI 3/));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[addr(0x00, 0x00, 0x11)]).toBe(10); // HDMI 1-8 = 0-7、SDI 3 = 10
    expect(screen.getByLabelText(/^AUX 1 SDI 3.*選択中$/)).toBeTruthy();
    expect(screen.getByText('現在：SDI 3')).toBeTruthy();
  });

  test('V-80HD：Aux 1 / Aux 2 の切替が出て、Aux 2 に書ける', async () => {
    await act(async () => {
      await controller.connectDemo('V-80HD');
    });
    await render(<AuxScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(screen.getByLabelText('AUX バス')).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByLabelText('AUX バス'), 'change', { nativeEvent: { selectedSegmentIndex: 1 } });
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^AUX 2 Still 5/));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[addr(0x00, 0x00, 0x19)]).toBe(12); // HDMI 1-4, SDI 1-4, Still 5 = 12
  });
});

describe('F16 マクロ・シーケンサー（デモ＝LAN 相当なので簡易制御コマンド経路）', () => {
  test('V-160HD：マクロ 7 → MCREX:MACRO7;、シーケンサー NEXT → SEQNX;、SEQ ON → SEQSW:ON; と QSEQSW; で状態が ON', async () => {
    await act(async () => {
      await controller.connectDemo('V-160HD');
    });
    const tx = () => useLogStore.getState().lines.filter((l) => l.dir === 'tx').map((l) => l.text);
    await render(<MacroScreen />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('マクロ 7 を実行'));
    });
    expect(tx()).toContain('MCREX:MACRO7;');
    expect(screen.getByText('最後に実行：マクロ 7')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('シーケンサー NEXT'));
    });
    expect(tx()).toContain('SEQNX;');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('シーケンサー ON/OFF'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(tx()).toContain('SEQSW:ON;');
    expect(useSimpleStore.getState().seqOn).toBe(true);
    expect(screen.getByText('SEQ OFF')).toBeTruthy();
  });

  test('V-80HD：LAN（デモ）ではマクロ 1–100 が出る', async () => {
    await act(async () => {
      await controller.connectDemo('V-80HD');
    });
    await render(<MacroScreen />);
    expect(screen.getByLabelText('マクロ 100 を実行')).toBeTruthy();
  });
});

describe('デモ VR-120HD（8 入力・AUX 3 本）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('VR-120HD');
    });
  });

  test('スイッチャー：INPUT 1–8（4 列）、CUT/AUTO なし、ラベルは Preview Label から', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('VR-120HD')).toBeTruthy();
    expect(screen.getAllByLabelText(/^プログラム \d+、/)).toHaveLength(8);
    expect(screen.queryByText('CUT')).toBeNull();
    expect(screen.getAllByText('CAM 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('プログラム 1、CAM 1、選択中')).toBeTruthy();
  });

  test('キー：PinP 4・DSK 2。シーン 32 件', async () => {
    await render(<KeysScreen />);
    expect(screen.getByText('PinP & KEY 4')).toBeTruthy();
    expect(screen.getByText('DSK 2')).toBeTruthy();
    await render(<MemoryScreen />);
    expect(screen.getByText('32')).toBeTruthy();
  });

  test('AUX 画面：AUX 1 / AUX 2 / AUX 3 を切り替えて AUX 3（00 00 25）に書ける', async () => {
    await render(<AuxScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    await act(async () => {
      fireEvent(screen.getByLabelText('AUX バス'), 'change', { nativeEvent: { selectedSegmentIndex: 2 } });
    });
    expect(screen.getByText('AUX 3 ソース')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/^AUX 3 SDI In 6/));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(useParamStore.getState().values[addr(0x00, 0x00, 0x25)]).toBe(11);
  });
});

describe('デモ VR-6HD（6 入力 3 列・PinP 2・DSK 1・BLE 対応）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('VR-6HD');
    });
  });

  test('スイッチャー：INPUT 1–6、CUT/AUTO は簡易制御コマンド経路で出る', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('VR-6HD')).toBeTruthy();
    expect(screen.getAllByLabelText(/^プログラム \d+、/)).toHaveLength(6);
    expect(screen.getByText('CUT')).toBeTruthy();
    expect(screen.getByLabelText('プログラム 1、CAM 1、選択中')).toBeTruthy();
  });

  test('キー：PinP 2・DSK 1、メモリー 32、AUX 1 本', async () => {
    await render(<KeysScreen />);
    expect(screen.getByText('PinP & KEY 2')).toBeTruthy();
    expect(screen.queryByText('PinP & KEY 3')).toBeNull();
    expect(screen.getAllByText('DSK')).toHaveLength(2); // グループ見出し＋1 系統の行
    await render(<MemoryScreen />);
    expect(screen.getByText('32')).toBeTruthy();
    await render(<AuxScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(screen.getByText('AUX ソース')).toBeTruthy();
  });
});

describe('デモ V-1-4K（8 入力・CUT/AUTO は SysEx・PinP 無し・DSK 1）', () => {
  beforeEach(async () => {
    await act(async () => {
      await controller.connectDemo('V-1-4K');
    });
  });

  test('スイッチャー：INPUT 1–8、CUT を押すと 0B 00 1A に 1→0 が書かれる', async () => {
    await render(<SwitcherScreen />);
    expect(screen.getByText('V-1-4K')).toBeTruthy();
    expect(screen.getAllByLabelText(/^プログラム \d+、/)).toHaveLength(8);
    expect(screen.getByLabelText('プログラム 1、CAM 1、選択中')).toBeTruthy();
    expect(screen.getByLabelText('プリセット 3、CAM 3、選択中')).toBeTruthy();
    const cut = screen.getByText('CUT');
    await act(async () => {
      fireEvent(cut, 'pressIn');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    await act(async () => {
      fireEvent(cut, 'pressOut');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    // モックは CUT（0B 00 1A）の押下で PGM/PST を入れ替える
    expect(useParamStore.getState().values[addr(0x00, 0x12, 0x00)]).toBe(0x09); // INPUT 3
    expect(useParamStore.getState().values[addr(0x00, 0x12, 0x01)]).toBe(0x07); // INPUT 1
  });

  test('キー：PinP 無し・DSK 1。メモリー 8', async () => {
    await render(<KeysScreen />);
    expect(screen.queryByText('PinP & KEY 1')).toBeNull();
    expect(screen.queryByText('PinP & KEY')).toBeNull();
    expect(screen.getAllByText('DSK')).toHaveLength(2);
    await render(<MemoryScreen />);
    expect(screen.getByText('08')).toBeTruthy();
    expect(screen.queryByText('09')).toBeNull();
  });
});
