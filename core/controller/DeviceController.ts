import { getProfile } from '../profiles';
import type { DeviceProfile, ModelId } from '../profiles/types';
import { MockTransport } from '../transport/MockTransport';
import type { ConnectTarget, Transport, TransportKind, Unsub } from '../transport/Transport';
import type { Addr } from '../codec/value';
import { useConnectionStore } from '@/stores/connection';
import { useLogStore } from '@/stores/log';
import { useParamStore } from '@/stores/param';
import type { PgmValueMode } from '@/stores/settings';

/**
 * 画面と Transport の仲介（SPEC §8-2）。
 * - 書込みは楽観更新してから Transport へ（SPEC §10-2）。ロールバックは M2 の SyncEngine で実装
 * - モーメンタリ（CUT）は押下中のアドレスを記録し、切断・非アクティブ時に必ず 00 を送る（SPEC §9-2）
 */

export const AUTO_TAP_RELEASE_MS = 150;

export type ConnectOutcome = { ok: true } | { ok: false; message: string };

export class DeviceController {
  private transport: Transport | null = null;
  private unsubs: Unsub[] = [];
  private pressed = new Set<Addr>();
  private tapTimers = new Set<ReturnType<typeof setTimeout>>();

  get profile(): DeviceProfile | null {
    const model = useConnectionStore.getState().model;
    return model ? getProfile(model) : null;
  }

  get online(): boolean {
    return useConnectionStore.getState().link === 'online';
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

  /** 実機接続（LAN は M3、USB/BLE は M4 で実装） */
  async connect(kind: Exclude<TransportKind, 'mock'>, target: ConnectTarget): Promise<ConnectOutcome> {
    const when = kind === 'lan' ? 'M3' : 'M4';
    useLogStore.getState().push({ ts: Date.now(), dir: 'info', text: `${kind.toUpperCase()} 接続は未実装（${when}）：${target.name}` });
    return { ok: false, message: `この接続方式は開発中です（${when} で実装）。デモモードで画面を確認できます。` };
  }

  async disconnect(reason?: string): Promise<void> {
    const t = this.transport;
    if (!t) return;
    this.releaseAll();
    for (const timer of this.tapTimers) clearTimeout(timer);
    this.tapTimers.clear();
    await t.disconnect(reason);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.transport = null;
    useParamStore.getState().clear();
    useConnectionStore.getState().reset();
  }

  /** パラメータ書込み（楽観更新） */
  write(a: Addr, bytes: number[]): void {
    if (!this.transport || !this.online) return;
    useParamStore.getState().optimistic(a, bytes);
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
      t.on('state', (s, err) => useConnectionStore.getState().setLink(s, err)),
      t.on('log', (e) => useLogStore.getState().push(e)),
    );
  }
}

export const controller = new DeviceController();
