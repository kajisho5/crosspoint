import { PROFILES } from '@/core/profiles';
import { DeviceController } from '@/core/controller/DeviceController';
import { buildDt1, parseSysEx, toHex } from '@/core/codec/SysExCodec';
import { addr, addrOffset, encodeU14, type Addr } from '@/core/codec/value';
import { v160hd } from '@/core/profiles/v160hd';
import { v80hd } from '@/core/profiles/v80hd';
import { buildDemoState } from '@/core/transport/demoState';
import { formatVersion, MidiTransport, rankEndpoints } from '@/core/transport/MidiTransport';
import type { LinkError, LinkState } from '@/core/transport/Transport';
import type { CrosspointMidi, CrosspointMidiEvents, MidiEndpointInfo } from '@/modules/crosspoint-midi/src';
import { useConnectionStore } from '@/stores/connection';
import { useParamStore } from '@/stores/param';
import type { DeviceProfile } from '@/core/profiles/types';

/**
 * ネイティブモジュールの偽物：SysEx を解釈して本体（V-160HD / V-80HD）の応答を返す。
 * - RQ1 → 自分の modelId なら DT1 で応答、違えば無応答（SPEC §4-1）
 * - DT1 → 書込み。書込みを他クライアント向け通知として DT1 で返す（MIDI 経由の自発通知は【不明】。テストでは有りとして扱う）
 */
class FakeMidi implements CrosspointMidi {
  listeners: { [K in keyof CrosspointMidiEvents]?: Set<CrosspointMidiEvents[K]> } = {};
  sent: number[][] = [];
  opened: { dest: number; src: number } | null = null;
  endpoints: MidiEndpointInfo[];
  mem: Map<Addr, number>;
  notifyWrites = true;
  pickerCalls = 0;

  constructor(
    readonly profile: DeviceProfile,
    readonly version: number[] = [0x33, 0x2e, 0x36, 0x30, 0x20, 0x20],
  ) {
    this.mem = buildDemoState(profile);
    this.endpoints = [
      { uniqueId: 1001, sourceUniqueId: 2001, name: `${profile.verName} MIDI 1`, deviceName: profile.verName, transport: 'usb', online: true, driverOwner: 'com.apple.AppleMIDIUSBDriver' },
      { uniqueId: 1002, sourceUniqueId: 2002, name: 'Other Keyboard', deviceName: 'Other', transport: 'usb', online: true, driverOwner: 'com.apple.AppleMIDIUSBDriver' },
    ];
  }

  async listEndpoints(): Promise<MidiEndpointInfo[]> {
    return this.endpoints;
  }
  async open(dest: number, src: number): Promise<void> {
    if (!this.endpoints.some((e) => e.uniqueId === dest && e.online)) throw new Error('MIDI_OPEN_FAILED: endpoint not found');
    this.opened = { dest, src };
  }
  async close(): Promise<void> {
    this.opened = null;
  }
  async presentBluetoothPicker(): Promise<void> {
    this.pickerCalls += 1;
  }
  async sendSysEx(bytes: number[]): Promise<void> {
    if (!this.opened) throw new Error('not open');
    this.sent.push(bytes);
    const parsed = parseSysEx(bytes, [this.profile.sysexModelId]);
    if (parsed.kind === 'other') return; // modelId 違い → 無応答
    setTimeout(() => {
      if (parsed.kind === 'rq1') {
        const data = parsed.addr === addr(0x02, 0, 0) ? this.version : Array.from({ length: parsed.size }, (_, i) => this.mem.get(addrOffset(parsed.addr, i)) ?? 0);
        this.emit('onSysEx', { bytes: buildDt1(this.profile.sysexModelId, parsed.addr, data), ts: Date.now() });
      } else if (parsed.kind === 'dt1') {
        parsed.data.forEach((b, i) => this.mem.set(addrOffset(parsed.addr, i), b));
        if (this.notifyWrites) this.emit('onSysEx', { bytes: buildDt1(this.profile.sysexModelId, parsed.addr, parsed.data), ts: Date.now() });
      }
    }, 2);
  }
  addListener<K extends keyof CrosspointMidiEvents>(event: K, listener: CrosspointMidiEvents[K]) {
    const map = this.listeners as Record<string, Set<unknown> | undefined>;
    const set = (map[event] ??= new Set<unknown>());
    set.add(listener);
    return { remove: () => set.delete(listener) };
  }
  emit<K extends keyof CrosspointMidiEvents>(event: K, payload: Parameters<CrosspointMidiEvents[K]>[0]): void {
    for (const l of this.listeners[event] ?? []) (l as (p: typeof payload) => void)(payload);
  }
  /** ケーブルを抜く／挿す */
  unplug(): void {
    this.endpoints = this.endpoints.map((e) => (e.uniqueId === 1001 ? { ...e, online: false } : e));
    this.opened = null;
    this.emit('onLinkLost', { uniqueId: 1001 });
  }
  replug(): void {
    this.endpoints = this.endpoints.map((e) => (e.uniqueId === 1001 ? { ...e, online: true } : e));
    this.emit('onEndpointsChanged', { endpoints: this.endpoints });
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('timeout');
    await wait(5);
  }
}

describe('MidiTransport（SPEC §4）', () => {
  test('接続確認：RQ1 版 → DT1 のヘッダで機種判定、syncing', async () => {
    const fake = new FakeMidi(v160hd);
    const t = new MidiTransport(fake, 'usb');
    const states: LinkState[] = [];
    t.on('state', (s) => states.push(s));
    const res = await t.connect({ name: 'X', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    expect(res).toEqual({ model: 'V-160HD', version: '3.60' });
    expect(states).toEqual(['connecting', 'authenticating', 'syncing']);
    // 接続確認では全対応機種分の RQ1 を送る（PROFILES の数）
    expect(fake.sent.length).toBe(Object.keys(PROFILES).length);
    expect(toHex(fake.sent[0]!)).toBe('F0 41 10 00 00 00 00 02 11 02 00 00 00 00 06 78 F7');
    await t.disconnect();
  });

  test('V-80HD も modelId 3byte で判定される', async () => {
    const fake = new FakeMidi(v80hd, [0x01, 0x30, 0x00, 0x00, 0x00, 0x00]);
    const t = new MidiTransport(fake, 'usb');
    const res = await t.connect({ name: 'X', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    expect(res.model).toBe('V-80HD');
    expect(res.version).toBe('01 30 00 00 00 00'); // 表示不能なら 16 進
    await t.disconnect();
  });

  test('書込みは DT1 一括、読出しは RQ1、受信 DT1 は param に正規化', async () => {
    const fake = new FakeMidi(v160hd);
    const t = new MidiTransport(fake, 'usb');
    const params = new Map<Addr, number[]>();
    t.on('param', (a, b) => params.set(a, b));
    await t.connect({ name: 'X', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    fake.sent.length = 0;
    t.writeParam(v160hd.addrs.fader, encodeU14(1024));
    await until(() => fake.sent.length === 1);
    expect(toHex(fake.sent[0]!)).toBe('F0 41 10 00 00 00 00 02 12 00 21 02 08 00 55 F7');
    t.readParam(v160hd.addrs.pgm, 2);
    await until(() => params.has(v160hd.addrs.pgm));
    expect(params.get(v160hd.addrs.pgm)).toEqual([v160hd.encodeInput(1), v160hd.encodeInput(3)]);
    await t.disconnect();
  });

  test('端点が消えたら reconnecting、再出現で自動再接続して syncing', async () => {
    const fake = new FakeMidi(v160hd);
    const t = new MidiTransport(fake, 'usb');
    const states: { s: LinkState; err?: LinkError }[] = [];
    t.on('state', (s, err) => states.push({ s, err }));
    await t.connect({ name: 'X', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    fake.unplug();
    expect(states.at(-1)).toEqual({ s: 'reconnecting', err: 'LINK_LOST' });
    fake.replug();
    await until(() => states.at(-1)?.s === 'syncing');
    expect(fake.opened).toEqual({ dest: 1001, src: 2001 });
    await t.disconnect();
  });

  test('無応答（modelId 違いの機器）は NO_RESPONSE', async () => {
    const fake = new FakeMidi({ ...v160hd, sysexModelId: [0x00, 0x00, 0x00, 0x00, 0x7e] }); // 対応外の Model ID
    const t = new MidiTransport(fake, 'ble', { verTimeoutMs: 100 });
    await expect(t.connect({ name: 'X', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 })).rejects.toMatchObject({ code: 'NO_RESPONSE' });
  });

  test('open 失敗は MIDI_OPEN_FAILED', async () => {
    const fake = new FakeMidi(v160hd);
    const t = new MidiTransport(fake, 'usb');
    await expect(t.connect({ name: 'X', midiDestUniqueId: 9999, midiSrcUniqueId: 0 })).rejects.toMatchObject({ code: 'MIDI_OPEN_FAILED' });
  });

  test('rankEndpoints：機種名の部分一致 → 経路 → online の順', () => {
    const eps: MidiEndpointInfo[] = [
      { uniqueId: 1, sourceUniqueId: 0, name: 'Keyboard', deviceName: 'K', transport: 'usb', online: true, driverOwner: '' },
      { uniqueId: 2, sourceUniqueId: 0, name: 'Roland V-160HD', deviceName: 'V-160HD', transport: 'ble', online: true, driverOwner: '' },
      { uniqueId: 3, sourceUniqueId: 0, name: 'V-80HD', deviceName: 'V-80HD', transport: 'usb', online: false, driverOwner: '' },
    ];
    expect(rankEndpoints(eps, 'usb').map((e) => e.uniqueId)).toEqual([3, 2, 1]);
    expect(rankEndpoints(eps, 'ble').map((e) => e.uniqueId)).toEqual([2, 3, 1]);
  });

  test('formatVersion', () => {
    expect(formatVersion([0x33, 0x2e, 0x36, 0x30, 0x20, 0x20])).toBe('3.60');
    expect(formatVersion([0x03, 0x06, 0x00, 0x00, 0x00, 0x00])).toBe('03 06 00 00 00 00');
  });
});

describe('DeviceController × MidiTransport', () => {
  afterEach(() => useParamStore.getState().clear());

  test('USB：接続→初期同期（版を含む）→online', async () => {
    const fake = new FakeMidi(v160hd);
    const c = new DeviceController({ lanSocketFactory: async () => { throw new Error('unused'); }, midiModule: () => fake });
    const res = await c.connect('usb', { name: 'DEMO-SW-A', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    expect(res).toEqual({ ok: true });
    expect(useConnectionStore.getState().link).toBe('online');
    expect(useConnectionStore.getState().transport).toBe('usb');
    const v = useParamStore.getState().values;
    expect(v[v160hd.addrs.pgm]).toBe(v160hd.encodeInput(1));
    expect(v[addr(0x02, 0, 0)]).toBe(0x33); // 版（MIDI のみ読む）
    await c.disconnect();
  });

  test('V-80HD は USB/BLE 無効（§9-5）→ ok:false', async () => {
    const fake = new FakeMidi(v80hd);
    const c = new DeviceController({ lanSocketFactory: async () => { throw new Error('unused'); }, midiModule: () => fake });
    const res = await c.connect('ble', { name: 'DEMO-SW-B', midiDestUniqueId: 1001, midiSrcUniqueId: 2001 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain('LAN のみ');
    expect(useConnectionStore.getState().link).toBe('idle');
  });

  test('ネイティブモジュール無しは明示メッセージ', async () => {
    const c = new DeviceController({ lanSocketFactory: async () => { throw new Error('unused'); }, midiModule: () => null });
    const res = await c.connect('usb', { name: 'X', midiDestUniqueId: 1 });
    expect(res.ok).toBe(false);
    const list = await c.listMidiEndpoints();
    expect(list.ok).toBe(false);
  });

  test('Bluetooth ピッカー → 端点一覧', async () => {
    const fake = new FakeMidi(v160hd);
    const c = new DeviceController({ lanSocketFactory: async () => { throw new Error('unused'); }, midiModule: () => fake });
    const r = await c.presentBluetoothPicker();
    expect(fake.pickerCalls).toBe(1);
    expect(r.ok && r.endpoints.length).toBe(2);
  });
});
