import { getProfile } from '@/core/profiles';
import { addrToHex, decodeU14 } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import { autoSteps, cancelFaderAuto, faderAuto, faderCut, isFaderAutoRunning, STEP_MS } from '@/lib/faderTransition';
import { useParamStore } from '@/stores/param';

const v80 = getProfile('V-80HD');

describe('Fader Level による CUT/AUTO（V-80HD / VR-120HD の USB/BLE）', () => {
  test('プロファイル：Fader Base のアドレス', () => {
    expect(addrToHex(v80.addrs.faderBase!)).toBe('001505');
    expect(addrToHex(getProfile('VR-120HD').addrs.faderBase!)).toBe('001B05');
    expect(getProfile('V-160HD').addrs.faderBase ?? null).toBeNull();
  });

  test('AUTO の中間値：単調増加で最後は faderMax', () => {
    const s = autoSteps(2047, 1.0);
    expect(s.length).toBe(Math.round(1000 / STEP_MS));
    expect(s[s.length - 1]).toBe(2047);
    for (let i = 1; i < s.length; i += 1) expect(s[i]!).toBeGreaterThanOrEqual(s[i - 1]!);
    expect(autoSteps(2047, 0)).toEqual([2047]);
  });

  describe('デモ接続（MockTransport が実機観測どおり完了で PGM/PST 入替・Level 0・Base 反転）', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await controller.connectDemo('V-80HD');
      jest.advanceTimersByTime(500);
    });
    afterEach(async () => {
      cancelFaderAuto();
      await controller.disconnect();
      jest.useRealTimers();
    });

    test('CUT：Fader Level に最大値を 1 回書くと PGM/PST が入れ替わる', () => {
      const v = () => useParamStore.getState().values;
      const pgm = v()[v80.addrs.pgm];
      const pst = v()[v80.addrs.pst!];
      faderCut(v80);
      jest.advanceTimersByTime(500);
      expect(v()[v80.addrs.pgm]).toBe(pst);
      expect(v()[v80.addrs.pst!]).toBe(pgm);
      expect(v()[v80.addrs.faderBase!]).toBe(1);
      const fa = v80.addrs.fader!;
      expect(decodeU14([v()[fa] ?? 0, v()[fa + 1] ?? 0])).toBe(0);
    });

    test('AUTO：TIME かけて書き、完了で入れ替わる', () => {
      const v = () => useParamStore.getState().values;
      const pgm = v()[v80.addrs.pgm];
      const done = jest.fn();
      faderAuto(v80, 0.5, done);
      expect(isFaderAutoRunning()).toBe(true);
      jest.advanceTimersByTime(250);
      expect(v()[v80.addrs.pgm]).toBe(pgm);
      jest.advanceTimersByTime(800);
      expect(done).toHaveBeenCalled();
      expect(isFaderAutoRunning()).toBe(false);
      expect(v()[v80.addrs.pst!]).toBe(pgm);
    });
  });
});
