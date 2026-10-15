/**
 * @jest-environment node
 */
import { DeviceController } from '@/core/controller/DeviceController';
import { encodeU14 } from '@/core/codec/value';
import { v160hd } from '@/core/profiles/v160hd';
import { nodeSocketFactory } from '@/core/transport/nodeSocket';
import { useConnectionStore } from '@/stores/connection';
import { useParamStore } from '@/stores/param';
import { startMockServer, type MockServer } from '../tools/mock-v160hd/server';

jest.setTimeout(20000);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('timeout');
    await wait(10);
  }
}

describe('DeviceController × LanTransport × モック（接続〜同期〜online〜楽観更新）', () => {
  let server: MockServer;
  const notices: string[] = [];
  const controller = new DeviceController({ lanSocketFactory: async () => nodeSocketFactory, midiModule: () => null, notify: (m) => notices.push(m) });

  beforeAll(async () => {
    server = await startMockServer({ model: 'V-160HD', port: 0, password: '1234', jitter: true });
  });
  afterAll(async () => {
    await controller.disconnect();
    await server.close();
  });

  test('connect(lan) → 初期同期が揃って online、画面用の値が入っている', async () => {
    const res = await controller.connect('lan', { name: 'DEMO-SW-A', host: '127.0.0.1', port: server.port, password: '1234' });
    expect(res).toEqual({ ok: true });
    const conn = useConnectionStore.getState();
    expect(conn.link).toBe('online');
    expect(conn.model).toBe('V-160HD');
    expect(conn.version).toBe('3.60');
    const v = useParamStore.getState().values;
    const p = v160hd.addrs;
    expect(v[p.pgm]).toBe(v160hd.encodeInput(1));
    expect(v[p.inputAssign(20)]).toBeDefined();
    expect(v[p.memName(30)]).toBeDefined();
    expect(v[p.tallyBlock + v160hd.tallyIndexOf(1)]).toBe(1);
    expect(notices).toEqual([]);
  });

  test('write は楽観更新され、ポーリング/通知で確定する（ロールバックしない）', async () => {
    const p = v160hd.addrs;
    controller.write(p.pst, [v160hd.encodeInput(7)]);
    expect(useParamStore.getState().values[p.pst]).toBe(v160hd.encodeInput(7));
    expect(useParamStore.getState().pending[p.pst]).toBeDefined();
    await until(() => useParamStore.getState().pending[p.pst] === undefined);
    expect(useParamStore.getState().confirmed[p.pst]).toBe(v160hd.encodeInput(7));
    expect(notices).toEqual([]);
  });

  test('ERR:5（範囲外）は楽観更新をロールバックして通知', async () => {
    const p = v160hd.addrs;
    const before = useParamStore.getState().confirmed[p.transType];
    controller.write(p.transType, [9]);
    await until(() => notices.length > 0);
    expect(useParamStore.getState().values[p.transType]).toBe(before);
    notices.length = 0;
  });

  test('press/release（CUT）で本体の PGM/PST が入れ替わり、自発通知で画面に反映', async () => {
    const p = v160hd.addrs;
    controller.write(p.fader, encodeU14(2047));
    const pgm = useParamStore.getState().values[p.pgm];
    const pst = useParamStore.getState().values[p.pst];
    controller.press(p.cut!);
    await wait(30);
    controller.release(p.cut!);
    await until(() => useParamStore.getState().values[p.pgm] === pst && useParamStore.getState().values[p.pst] === pgm);
  });

  test('disconnect で store が初期化される', async () => {
    await controller.disconnect('test');
    expect(useConnectionStore.getState().link).toBe('idle');
    expect(Object.keys(useParamStore.getState().values).length).toBe(0);
    await until(() => server.clientCount() === 0);
  });

  test('パスワード誤りは ok:false と日本語メッセージ', async () => {
    const res = await controller.connect('lan', { name: 'DEMO-SW-A', host: '127.0.0.1', port: server.port, password: '9999' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain('パスワード');
    expect(useConnectionStore.getState().error).toBe('AUTH_FAILED');
  });
});
