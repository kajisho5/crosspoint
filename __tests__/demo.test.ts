import { decodeLevel, encodeTime } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { getProfile } from '@/core/profiles';
import { useConnectionStore } from '@/stores/connection';
import { useLogStore } from '@/stores/log';
import { readBytes, useParamStore } from '@/stores/param';

const flush = (ms = 20) => new Promise((r) => setTimeout(r, ms));

afterEach(async () => {
  await controller.disconnect();
  useLogStore.getState().clear();
});

describe('デモモード（F11, MockTransport）', () => {
  test('V-160HD：接続・初期値（PGM=INPUT1, PST=INPUT3, ラベル）', async () => {
    await controller.connectDemo('V-160HD');
    const c = useConnectionStore.getState();
    expect(c.link).toBe('online');
    expect(c.demo).toBe(true);
    expect(c.deviceName).toBe('DEMO-SW-A');
    expect(c.version).toBe('3.60');
    const p = getProfile('V-160HD');
    const v = useParamStore.getState().values;
    expect(v[p.addrs.pgm]).toBe(0x20);
    expect(v[p.addrs.pst!]).toBe(0x22);
    expect(String.fromCharCode(...(readBytes(v, 0x02 << 14 | 0x10 << 7, 5) as number[]))).toBe('CAM 1');
    expect(decodeLevel(readBytes(v, p.addrs.masterLevel, 3) as number[])).toBe(-2);
  });

  test('PGM 書込みは楽観更新され、タリーも更新される', async () => {
    await controller.connectDemo('V-160HD');
    const p = getProfile('V-160HD');
    controller.write(p.addrs.pgm, [p.encodeInput(5)]);
    expect(useParamStore.getState().values[p.addrs.pgm]).toBe(0x24);
    expect(useParamStore.getState().pending[p.addrs.pgm]).toBeDefined();
    await flush();
    const s = useParamStore.getState();
    expect(s.pending[p.addrs.pgm]).toBeUndefined();
    const tally = readBytes(s.values, p.addrs.tallyBlock!, 42).map((b) => b ?? 0);
    expect(p.tallyOf(5, tally)).toBe('pgm');
    expect(p.tallyOf(1, tally)).toBe('off');
  });

  test('CUT：押下で PGM/PST 入替、解放で 00（SPEC §9-2）', async () => {
    await controller.connectDemo('V-160HD');
    const p = getProfile('V-160HD');
    const cut = p.addrs.cut!;
    controller.press(cut);
    await flush();
    expect(useParamStore.getState().values[p.addrs.pgm]).toBe(0x22);
    expect(useParamStore.getState().values[p.addrs.pst!]).toBe(0x20);
    controller.release(cut);
    const tx = useLogStore.getState().lines.filter((l) => l.dir === 'tx').map((l) => l.text);
    expect(tx).toContain('DTH:0B001E,01;');
    expect(tx).toContain('DTH:0B001E,00;');
  });

  test('AUTO：TIME 経過後に入替（タップは 01 → 00）', async () => {
    await controller.connectDemo('V-160HD');
    const p = getProfile('V-160HD');
    controller.write(p.addrs.transTime, encodeTime(0.1));
    await flush();
    controller.tap(p.addrs.auto!);
    await flush(300);
    expect(useParamStore.getState().values[p.addrs.pgm]).toBe(0x22);
    const tx = useLogStore.getState().lines.filter((l) => l.dir === 'tx').map((l) => l.text);
    expect(tx).toContain('DTH:0B001F,01;');
    expect(tx).toContain('DTH:0B001F,00;');
  });

  test('切断で押下中のモーメンタリを解放し、状態をリセット', async () => {
    await controller.connectDemo('V-160HD');
    const cut = getProfile('V-160HD').addrs.cut!;
    controller.press(cut);
    await controller.disconnect();
    const tx = useLogStore.getState().lines.filter((l) => l.dir === 'tx').map((l) => l.text);
    expect(tx[tx.length - 1]).toBe('DTH:0B001E,00;');
    expect(useConnectionStore.getState().link).toBe('idle');
    expect(Object.keys(useParamStore.getState().values)).toHaveLength(0);
  });

  test('V-80HD：シーン 32 件・PGM 値 0x28+n・メモリー呼出し', async () => {
    await controller.connectDemo('V-80HD');
    const p = getProfile('V-80HD');
    expect(useConnectionStore.getState().model).toBe('V-80HD');
    expect(useParamStore.getState().values[p.addrs.pgm]).toBe(0x29);
    controller.write(p.addrs.memLoad, [11]);
    await flush();
    expect(useParamStore.getState().values[p.addrs.memCurrent!]).toBe(11);
  });

  test('未接続では書込みしない', () => {
    const p = getProfile('V-160HD');
    controller.write(p.addrs.pgm, [0x20]);
    expect(useParamStore.getState().values[p.addrs.pgm]).toBeUndefined();
  });

  test('guide10 モードは V-160HD の INPUT 1–10 のみ n−1', () => {
    expect(controller.encodePgmValue(getProfile('V-160HD'), 1, 'guide10')).toBe(0x00);
    expect(controller.encodePgmValue(getProfile('V-160HD'), 11, 'guide10')).toBe(0x2a);
    expect(controller.encodePgmValue(getProfile('V-80HD'), 1, 'guide10')).toBe(0x29);
  });
});
