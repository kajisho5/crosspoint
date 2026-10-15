import { getProfile } from '../profiles';
import type { DeviceProfile, ModelId } from '../profiles/types';
import { MockTransport } from '../transport/MockTransport';
import { LanTransport } from '../transport/LanTransport';
import { MidiTransport } from '../transport/MidiTransport';
import type { SocketFactory } from '../transport/socket';
import { getCrosspointMidi, type CrosspointMidi, type MidiEndpointInfo } from '@/modules/crosspoint-midi/src';
import { LINK_ERROR_MESSAGE, toLinkError, type ConnectTarget, type Transport, type TransportKind, type Unsub } from '../transport/Transport';
import type { Addr } from '../codec/value';
import { mergeRanges, SyncEngine, type ReadRange, type VisibleTab } from './SyncEngine';
import { useConnectionStore } from '@/stores/connection';
import { useLogStore } from '@/stores/log';
import { useParamStore } from '@/stores/param';
import { useSettingsStore, type PgmValueMode } from '@/stores/settings';

/**
 * 画面と Transport の仲介（SPEC §8-2）。
 * - 書込みは楽観更新してから Transport へ（SPEC §10-2）。ロールバックは SyncEngine
 * - モーメンタリ（CUT）は押下中のアドレスを記録し、切断・非アクティブ時に必ず 00 を送る（SPEC §9-2）
 * - 実機 transport は 'syncing' を出したら SyncEngine で初期同期し、完了後に 'online' にする
 */

export const AUTO_TAP_RELEASE_MS = 150;

export type ConnectOutcome = { ok: true } | { ok: false; message: string };
export type MidiEndpointList = { ok: true; endpoints: MidiEndpointInfo[] } | { ok: false; message: string };

export interface DeviceControllerDeps {
  /** LAN 用ソケット実装（既定は実機用 rnSocket。テストでは Node 版を差し込む） */
  lanSocketFactory: () => Promise<SocketFactory>;
  /** MIDI ネイティブモジュール（無ければ null = USB/BLE 非対応環境） */
  midiModule: () => CrosspointMidi | null;
  /** 利用者向けの短い通知（Toast）。未設定ならログのみ */
  notify?: (message: string) => void;
}

const defaultDeps: DeviceControllerDeps = {
  lanSocketFactory: async () => (await import('../transport/rnSocket')).rnSocketFactory,
  midiModule: () => getCrosspointMidi(),
};

export const MIDI_UNAVAILABLE_MESSAGE = 'この環境では USB / Bluetooth MIDI を使えません（Development Build の iPhone で使えます）。';

export class DeviceController {
  private transport: Transport | null = null;
  private unsubs: Unsub[] = [];
  private pressed = new Set<Addr>();
  private tapTimers = new Set<ReturnType<typeof setTimeout>>();
  private sync: SyncEngine | null = null;
  private visibleTab: VisibleTab = 'switcher';
  private extraPoll: ReadRange[] | null = null;
  private syncGeneration = 0;

  constructor(private deps: DeviceControllerDeps = defaultDeps) {}

  /** テスト・開発用に依存を差し替える */
  configure(deps: Partial<DeviceControllerDeps>): void {
    this.deps = { ...this.deps, ...deps };
  }

  get profile(): DeviceProfile | null {
    const model = useConnectionStore.getState().model;
    return model ? getProfile(model) : null;
  }

  get online(): boolean {
    return useConnectionStore.getState().link === 'online';
  }

  get currentTransport(): Transport | null {
    return this.transport;
  }

  /** F11 デモモード：実機への接続処理は一切行わない */
  async connectDemo(model: ModelId, name = 'DEMO-SW-A'): Promise<ConnectOutcome> {
    await this.disconnect();
    const t = new MockTransport(model);
    this.attach(t);
    useConnectionStore.getState().setSession({ transport: 'mock', deviceName: name, model, demo: true });
    const res = await t.connect({ name, model });
    useParamStore.getState().clear();
    useParamStore.getState().applyMap(t.snapshot());
    useConnectionStore.getState().setDevice(res.model, res.version);
    return { ok: true };
  }

  /** 実機接続（LAN：M3、USB/BLE：M4） */
  async connect(kind: Exclude<TransportKind, 'mock'>, target: ConnectTarget): Promise<ConnectOutcome> {
    await this.disconnect();
    let t: Transport;
    if (kind === 'lan') {
      const factory = await this.deps.lanSocketFactory();
      t = new LanTransport(factory);
    } else {
      const midi = this.deps.midiModule();
      if (!midi) {
        this.info(`${kind.toUpperCase()}：ネイティブモジュール無し`);
        return { ok: false, message: MIDI_UNAVAILABLE_MESSAGE };
      }
      t = new MidiTransport(midi, kind);
    }
    this.attach(t);
    useConnectionStore.getState().setSession({ transport: kind, deviceName: target.name, model: target.model ?? null, demo: false });
    try {
      const res = await t.connect(target);
      const profile = getProfile(res.model);
      if (kind !== 'lan' && !profile.capabilities[kind]) {
        // SPEC §9-5：V-80HD の USB/BLE は §13 の確認まで無効
        await this.disconnect(`${profile.model} は ${kind.toUpperCase()} 未確認`);
        return { ok: false, message: `${profile.model} は現在 LAN のみ対応です（${kind.toUpperCase()} は実機確認後に有効化）。` };
      }
      useConnectionStore.getState().setDevice(res.model, res.version);
      await this.runInitialSync();
      return { ok: true };
    } catch (e) {
      const code = toLinkError(e);
      await this.disconnect();
      useConnectionStore.getState().setLink('error', code);
      return { ok: false, message: LINK_ERROR_MESSAGE[code] };
    }
  }

  /** Bluetooth MIDI ピッカー（CABTMIDICentralViewController）。閉じたら端点一覧を返す */
  async presentBluetoothPicker(): Promise<MidiEndpointList> {
    const midi = this.deps.midiModule();
    if (!midi) return { ok: false, message: MIDI_UNAVAILABLE_MESSAGE };
    try {
      await midi.presentBluetoothPicker();
      return { ok: true, endpoints: await midi.listEndpoints() };
    } catch (e) {
      return { ok: false, message: String((e as Error)?.message ?? e) };
    }
  }

  /** CoreMIDI の端点一覧（USB / BLE タブの再検索） */
  async listMidiEndpoints(): Promise<MidiEndpointList> {
    const midi = this.deps.midiModule();
    if (!midi) return { ok: false, message: MIDI_UNAVAILABLE_MESSAGE };
    try {
      return { ok: true, endpoints: await midi.listEndpoints() };
    } catch (e) {
      return { ok: false, message: String((e as Error)?.message ?? e) };
    }
  }

  async disconnect(reason?: string): Promise<void> {
    const t = this.transport;
    if (!t) return;
    this.releaseAll();
    for (const timer of this.tapTimers) clearTimeout(timer);
    this.tapTimers.clear();
    this.sync?.stop();
    this.sync = null;
    this.syncGeneration += 1;
    await t.disconnect(reason);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.transport = null;
    useParamStore.getState().clear();
    useConnectionStore.getState().reset();
  }

  /** 表示中タブ（ポーリング対象の切替。SPEC §10-2） */
  setVisibleTab(tab: VisibleTab): void {
    this.visibleTab = tab;
    this.sync?.setVisibleTab(tab);
  }

  /** 設定メニューなど、画面が開いている間だけ追加で監視する範囲 */
  setExtraPoll(ranges: ReadRange[] | null): void {
    this.extraPoll = ranges;
    this.sync?.setExtraPoll(ranges);
  }

  /** 任意範囲を今すぐ読む（デモは即時応答、実機はキュー経由） */
  readRanges(ranges: ReadRange[]): void {
    if (!this.transport || !this.online) return;
    for (const r of mergeRanges(ranges)) this.transport.readParam(r.addr, r.size);
  }

  /** パラメータ書込み（楽観更新） */
  write(a: Addr, bytes: number[]): void {
    if (!this.transport || !this.online) return;
    useParamStore.getState().optimistic(a, bytes);
    this.transport.writeParam(a, bytes);
  }

  /** 書込み専用トリガ（メモリー呼出し・任意コマンド）：楽観更新しない */
  trigger(a: Addr, bytes: number[]): void {
    if (!this.transport || !this.online) return;
    this.transport.writeParam(a, bytes);
  }

  read(a: Addr, size: number): void {
    if (!this.transport || !this.online) return;
    this.transport.readParam(a, size);
  }

  /** モーメンタリ押下（touchDown） */
  press(a: Addr): void {
    if (!this.transport || !this.online || this.pressed.has(a)) return;
    this.pressed.add(a);
    this.transport.writeParam(a, [1]);
  }

  /** モーメンタリ解放（touchUp / touchCancel） */
  release(a: Addr): void {
    if (!this.pressed.has(a)) return;
    this.pressed.delete(a);
    this.transport?.writeParam(a, [0]);
  }

  /** タップ（01 → 150ms 後 00）：AUTO */
  tap(a: Addr): void {
    if (!this.transport || !this.online) return;
    this.press(a);
    const timer = setTimeout(() => {
      this.tapTimers.delete(timer);
      this.release(a);
    }, AUTO_TAP_RELEASE_MS);
    this.tapTimers.add(timer);
  }

  /** アプリ非アクティブ時など：押下中をすべて解放 */
  releaseAll(): void {
    for (const a of [...this.pressed]) this.release(a);
  }

  /** INPUT n を PGM/PST に書く値（SPEC §9-3：V-160HD のみ guide10 を選べる） */
  encodePgmValue(p: DeviceProfile, n: number, mode: PgmValueMode): number {
    if (p.model === 'V-160HD' && mode === 'guide10' && n <= 10) return n - 1;
    return p.encodeInput(n);
  }

  private attach(t: Transport): void {
    this.transport = t;
    this.unsubs.push(
      t.on('param', (a, bytes) => useParamStore.getState().apply(a, bytes)),
      t.on('state', (s, err) => {
        useConnectionStore.getState().setLink(s, err);
        if (s === 'syncing' && t.kind !== 'mock' && this.sync) {
          // 再接続後の再同期（初回は connect() 内で行う）
          void this.runInitialSync();
        }
        if (s === 'reconnecting' || s === 'idle' || s === 'error') this.releaseAll();
      }),
      t.on('log', (e) => useLogStore.getState().push(e)),
      t.on('err', (code) => this.sync?.onDeviceError(code)),
      t.on('rtt', (ms) => useConnectionStore.getState().setRtt(ms)),
    );
  }

  private async runInitialSync(): Promise<void> {
    const t = this.transport;
    const profile = this.profile;
    if (!t || !profile || t.kind === 'mock') return;
    const gen = ++this.syncGeneration;
    this.sync?.stop();
    const sync = new SyncEngine(
      t,
      profile,
      {
        getValue: (a) => useParamStore.getState().values[a],
        pendingEntries: () => Object.entries(useParamStore.getState().pending).map(([k, v]) => ({ addr: Number(k), ts: v.ts })),
        rollback: (a) => useParamStore.getState().rollback(a),
      },
      {
        link: t.kind === 'lan' ? 'lan' : 'midi',
        pollMs: () => useSettingsStore.getState().pollMs,
        onNotice: (m) => this.notify(m),
        log: (m) => this.info(m),
      },
    );
    sync.setVisibleTab(this.visibleTab);
    sync.setExtraPoll(this.extraPoll);
    this.sync = sync;
    const { missing } = await sync.initialSync();
    if (gen !== this.syncGeneration || this.transport !== t) return;
    if (missing.length > 0) this.notify(`一部の値が読み取れませんでした（${missing.length} 件）`);
    useConnectionStore.getState().setLink('online');
    sync.start();
  }

  private notify(message: string): void {
    this.info(message);
    this.deps.notify?.(message);
  }

  private info(text: string): void {
    useLogStore.getState().push({ ts: Date.now(), dir: 'info', text });
  }
}

export const controller = new DeviceController();
