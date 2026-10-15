/**
 * @jest-environment node
 */
import { addr, addrOffset, decodeU14, encodeU14, type Addr } from '@/core/codec/value';
import { LanTransport } from '@/core/transport/LanTransport';
import { nodeSocketFactory } from '@/core/transport/nodeSocket';
import type { LinkError, LinkState } from '@/core/transport/Transport';
import { v160hd } from '@/core/profiles/v160hd';
import { v80hd } from '@/core/profiles/v80hd';
import { vr120hd } from '@/core/profiles/vr120hd';
import { startMockServer, type MockServer } from '../tools/mock-v160hd/server';

/** SPEC §12-4 結合テスト：モックサーバーに対し 接続→認証→同期→PGM 変更→自発通知→CUT→切断→自動再接続 */

jest.setTimeout(20000);

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function until(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('timeout');
    await wait(10);
  }
}

function collect(t: LanTransport) {
  const params = new Map<Addr, number>();
  const states: { s: LinkState; err?: LinkError }[] = [];
  const errs: number[] = [];
  t.on('param', (a, bytes) => bytes.forEach((b, i) => params.set(addrOffset(a, i), b)));
  t.on('state', (s, err) => states.push({ s, err }));
  t.on('err', (c) => errs.push(c));
  return { params, states, errs };
}

describe('LAN 結合（V-160HD モック）', () => {
  let server: MockServer;
  beforeAll(async () => {
    server = await startMockServer({ model: 'V-160HD', port: 0, password: '1234' });
  });
  afterAll(async () => {
    await server.close();
  });

  test('接続→認証→VER→読出し→書込み→自発通知→CUT→切断', async () => {
    const t = new LanTransport(nodeSocketFactory, { keepAliveIdleMs: 500, keepAliveReplyMs: 300 });
    const c = collect(t);
    const res = await t.connect({ name: 'DEMO-SW-A', host: '127.0.0.1', port: server.port, password: '1234' });
    expect(res).toEqual({ model: 'V-160HD', version: '3.60' });
    expect(c.states.map((x) => x.s)).toEqual(['connecting', 'authenticating', 'syncing']);

    // 読出し（RQH）：PGM/PST/Tバー 4 バイトが連結 hex で返る
    const p = v160hd.addrs;
    t.readParam(p.pgm, 4);
    await until(() => c.params.has(p.fader + 1));
    expect(c.params.get(p.pgm)).toBe(v160hd.encodeInput(1));
    expect(c.params.get(p.pst)).toBe(v160hd.encodeInput(3));

    // 書込み（DTH）→ サーバー側メモリに反映。ACK はログのみ
    t.writeParam(p.pst, [v160hd.encodeInput(5)]);
    await until(() => server.mem.get(p.pst) === v160hd.encodeInput(5));

    // 多バイト書込みは 1 バイトずつ DTH、サーバーで u14 として読める
    t.writeParam(p.fader, encodeU14(1024));
    await until(() => decodeU14([server.mem.get(p.fader) ?? 0, server.mem.get(p.fader + 1) ?? 0]) === 1024);

    // タリー購読 → PGM 変更で 0C0000 がまとめて届く
    t.writeParam(addr(0x0c, 0x01, 0x00), [1]);
    await wait(50);
    server.panelWrite(p.pgm, [v160hd.encodeInput(2)]);
    await until(() => c.params.get(p.pgm) === v160hd.encodeInput(2)); // 自発通知
    await until(() => c.params.get(p.tallyBlock + v160hd.tallyIndexOf(2)) === 1); // PGM タリー
    expect(c.params.get(p.tallyBlock + v160hd.tallyIndexOf(5))).toBe(2); // PST タリー

    // CUT：押下→解放で PGM/PST 入替
    t.writeParam(p.cut!, [1]);
    await wait(30);
    t.writeParam(p.cut!, [0]);
    await until(() => server.mem.get(p.pgm) === v160hd.encodeInput(5) && server.mem.get(p.pst) === v160hd.encodeInput(2));

    // 範囲外書込みは ERR:5
    t.writeParam(p.transType, [9]);
    await until(() => c.errs.includes(5));

    // キープアライブ：無通信で VER が飛び、応答があれば維持
    await wait(900);
    expect(t.linkState).toBe('syncing');
    expect(server.clientCount()).toBe(1);

    await t.disconnect('テスト終了');
    expect(c.states.at(-1)?.s).toBe('idle');
    await until(() => server.clientCount() === 0);
  });

  test('パスワード誤りは AUTH_FAILED', async () => {
    const t = new LanTransport(nodeSocketFactory);
    const c = collect(t);
    await expect(t.connect({ name: 'X', host: '127.0.0.1', port: server.port, password: '0000' })).rejects.toMatchObject({ code: 'AUTH_FAILED' });
    expect(c.states[c.states.length - 1]).toEqual({ s: 'error', err: 'AUTH_FAILED' });
  });

  test('保存済み機種と違えば WRONG_DEVICE', async () => {
    const t = new LanTransport(nodeSocketFactory);
    await expect(t.connect({ name: 'X', host: '127.0.0.1', port: server.port, password: '1234', model: 'V-80HD' })).rejects.toMatchObject({ code: 'WRONG_DEVICE' });
    await t.disconnect();
  });

  test('接続拒否は REFUSED', async () => {
    const t = new LanTransport(nodeSocketFactory, { connectTimeoutMs: 1000 });
    await expect(t.connect({ name: 'X', host: '127.0.0.1', port: 1, password: '1234' })).rejects.toMatchObject({ code: 'REFUSED' });
  });

  test('本体側切断 → reconnecting → 自動再接続で syncing に戻る', async () => {
    const t = new LanTransport(nodeSocketFactory, { backoffMs: [100, 100] });
    const c = collect(t);
    await t.connect({ name: 'DEMO-SW-A', host: '127.0.0.1', port: server.port, password: '1234' });
    const before = c.states.length;
    // サーバーを閉じて開き直す（同ポート）
    const port = server.port;
    await server.close();
    await until(() => c.states.some((x, i) => i >= before && x.s === 'reconnecting'));
    server = await startMockServer({ model: 'V-160HD', port, password: '1234' });
    await until(() => c.states.at(-1)?.s === 'syncing', 5000);
    expect(c.states.slice(before).map((x) => x.s)).toContain('reconnecting');
    await t.disconnect();
  });
});

describe('LAN 結合（V-80HD モック：--model v80hd）', () => {
  let server: MockServer;
  beforeAll(async () => {
    server = await startMockServer({ model: 'V-80HD', port: 0, split: true });
  });
  afterAll(async () => {
    await server.close();
  });

  test('8 文字 PW、Welcome to V-80HD.、stx+ACK、0B 領域は ERR:0', async () => {
    const t = new LanTransport(nodeSocketFactory);
    const c = collect(t);
    const logs: string[] = [];
    t.on('log', (e) => logs.push(`${e.dir} ${e.text}`));
    const res = await t.connect({ name: 'DEMO-SW-B', host: '127.0.0.1', port: server.port, password: '00000000' });
    expect(res).toEqual({ model: 'V-80HD', version: '1.30' });
    expect(logs).toContain('rx Welcome to V-80HD.');

    const p = v80hd.addrs;
    t.writeParam(p.pst, [v80hd.encodeInput(4)]);
    await until(() => server.mem.get(p.pst) === v80hd.encodeInput(4));
    expect(logs).toContain('rx ACK');

    t.writeParam(addr(0x0b, 0x00, 0x1e), [1]);
    await until(() => c.errs.includes(0));

    // 自発通知なし：本体側変更はポーリング（RQH）で拾う
    server.panelWrite(p.pgm, [v80hd.encodeInput(2)]);
    await wait(50);
    expect(c.params.get(p.pgm)).toBeUndefined();
    t.readParam(p.pgm, 2);
    await until(() => c.params.get(p.pgm) === v80hd.encodeInput(2));
    await t.disconnect();
  });
});

describe('LAN 結合（VR-120HD モック：--model vr120hd）', () => {
  let server: MockServer;
  beforeAll(async () => {
    server = await startMockServer({ model: 'VR-120HD', port: 0, ack: 'byte06', jitter: true });
  });
  afterAll(async () => {
    await server.close();
  });

  test('4 桁 PW、VER:VR-120HD,2.00、PGM 1DH+n、タリー 37 バイト', async () => {
    const t = new LanTransport(nodeSocketFactory);
    const c = collect(t);
    const logs: string[] = [];
    t.on('log', (e) => logs.push(`${e.dir} ${e.text}`));
    const res = await t.connect({ name: 'DEMO-SW-C', host: '127.0.0.1', port: server.port, password: '0000' });
    expect(res).toEqual({ model: 'VR-120HD', version: '2.00' });
    expect(logs).toContain('rx Welcome to VR-120HD.');

    const p = vr120hd.addrs;
    t.writeParam(p.pst, [vr120hd.encodeInput(5)]);
    await until(() => server.mem.get(p.pst) === 0x21);
    t.readParam(p.tallyBlock, p.tallyBlockSize);
    await until(() => c.params.get(p.tallyBlock + 0x1c + 5) === 2); // Input 5 = PST
    expect(c.params.get(p.tallyBlock + 0x1c + 1)).toBe(1); // Input 1 = PGM
    await t.disconnect();
  });
});
