import { LanParser } from '../codec/lanParser';
import { formatDthBytes, formatRqh, parseLanMessage, VER_COMMAND, ERR_TEXT } from '../codec/TextCodec';
import type { Addr } from '../codec/value';
import { CommandQueue, type QueuedCommand } from '../controller/CommandQueue';
import { profileFromVerName } from '../profiles';
import type { ModelId } from '../profiles/types';
import { textMapFor, type TextCommandMap } from '../codec/textCommandMap';
import { classifySocketError, type RawSocket, type SocketFactory } from './socket';
import {
  LinkFailure,
  type ConnectResult,
  type ConnectTarget,
  type LinkError,
  type LinkState,
  type LogEntry,
  type Transport,
  type TransportKind,
  type Unsub,
} from './Transport';

/**
 * LAN（TCP）Transport（SPEC §3）。
 * - 認証：`Enter password:` → `{PW}\n` → `Welcome to {機種}.` → `VER;`（§3-2）
 * - 送信は CommandQueue（§3-6）経由。複数バイトは 1 バイトずつ DTH（§3-3）。多バイト値は coalesce
 * - 受信は LanParser（§3-4）→ parseLanMessage。DTH は param、ERR は err、ACK はログ
 * - 切断：close/error → reconnecting、バックオフ 1→2→4→8→15s（§3-7）。無通信 10s で VER キープアライブ、5s 無応答で切断扱い
 * connect() は認証・機種確認まで含めて resolve し、状態 'syncing' を出す（'online' は同期完了後に controller が出す）。
 *
 * テキストモード（V-60HD / V-600UHD / VR-50HD MK II）：VER 応答の機種名でプロファイルが 'text' なら、以後の
 * writeParam / readParam を core/codec/textCommandMap.ts でコマンドへ変換して送る。本体は値を echo しないので、
 * ACK を受けたら直前の書込値を param 通知して確定扱いにする（§3-6 の楽観更新の戻しを防ぐ）。
 */

export interface LanTransportOptions {
  connectTimeoutMs?: number;
  promptTimeoutMs?: number;
  authTimeoutMs?: number;
  verTimeoutMs?: number;
  keepAliveIdleMs?: number;
  keepAliveReplyMs?: number;
  backoffMs?: readonly number[];
  /** 連続値（多バイト）の送信間隔（coalesce 用、§3-6：LAN 33ms） */
  continuousIntervalMs?: number;
}

const DEFAULTS: Required<LanTransportOptions> = {
  connectTimeoutMs: 5000,
  promptTimeoutMs: 1500, // プロンプトは接続直後に来る。来ない機種（V-60HD 等）の VER 送出を早める
  authTimeoutMs: 5000,
  verTimeoutMs: 3000,
  keepAliveIdleMs: 10000,
  keepAliveReplyMs: 5000,
  backoffMs: [1000, 2000, 4000, 8000, 15000],
  continuousIntervalMs: 33,
};

export const DEFAULT_LAN_PORT = 8023;

type Waiter<T> = { resolve: (v: T) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

export class LanTransport implements Transport {
  readonly kind: TransportKind = 'lan';

  private readonly opt: Required<LanTransportOptions>;
  private socket: RawSocket | null = null;
  private parser = new LanParser();
  private queue: CommandQueue;
  private target: ConnectTarget | null = null;
  private model: ModelId | null = null;
  private up = false;
  private closing = false;
  private passwordSent = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
  private verSentAt = 0;
  /** テキストモード（null = DTH/RQH） */
  private textMap: TextCommandMap | null = null;
  /** テキストモード：ACK 待ちの書込（FIFO。ACK で echo） */
  private textEchoes: { addr: Addr; bytes: number[] }[] = [];
  /** テキストモード：直前に送った問い合わせ（QAL の応答に a が無いため） */
  private lastQuery: string | null = null;
  private lastQueryAt = 0;
  /** テキストモード：既知の現在値（トグル系コマンドの判断用） */
  private shadow = new Map<Addr, number>();

  private promptWaiter: Waiter<'prompt' | 'ver'> | null = null;
  private welcomeWaiter: Waiter<string> | null = null;
  private verWaiter: Waiter<{ model: string; version: string }> | null = null;

  private paramCbs = new Set<(a: Addr, bytes: number[]) => void>();
  private stateCbs = new Set<(s: LinkState, err?: LinkError) => void>();
  private logCbs = new Set<(e: LogEntry) => void>();
  private errCbs = new Set<(code: number) => void>();
  private rttCbs = new Set<(ms: number) => void>();
  private textCbs = new Set<(text: string) => void>();
  private state: LinkState = 'idle';

  constructor(
    private readonly factory: SocketFactory,
    options: LanTransportOptions = {},
  ) {
    this.opt = { ...DEFAULTS, ...options };
    this.queue = new CommandQueue((cmd) => this.sendCommand(cmd), { highGapMs: 20, lowBatch: 4, lowBatchGapMs: 5 });
  }

  get linkState(): LinkState {
    return this.state;
  }

  async connect(target: ConnectTarget): Promise<ConnectResult> {
    await this.disconnect();
    this.closing = false;
    this.target = target;
    this.attempt = 0;
    try {
      return await this.openSession();
    } catch (e) {
      const code = e instanceof LinkFailure ? e.code : 'NO_RESPONSE';
      this.emitState('error', code);
      throw e;
    }
  }

  async disconnect(reason?: string): Promise<void> {
    this.closing = true;
    this.clearReconnect();
    this.queue.clear();
    this.rejectWaiters(new LinkFailure('LINK_LOST', reason ?? 'disconnect'));
    this.stopKeepAlive();
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.destroy();
      this.log('info', reason ? `切断：${reason}` : '切断');
    }
    this.up = false;
    this.model = null;
    this.textMap = null;
    this.textEchoes = [];
    this.lastQuery = null;
    this.shadow.clear();
    this.parser.reset();
    if (this.state !== 'idle') this.emitState('idle');
  }

  writeParam(a: Addr, bytes: number[]): void {
    if (!this.up) return;
    // 多バイト値（T バー・レベル・名前）は同アドレスの未送信分を最新値で上書き
    this.queue.write(a, bytes, bytes.length >= 2);
  }

  readParam(a: Addr, size: number): void {
    if (!this.up) return;
    this.queue.read(a, size);
  }

  /** 診断用：生テキストをそのまま送る（終端は呼び出し側で付ける） */
  sendRaw(text: string): void {
    this.write(text);
  }

  /** 簡易制御コマンド（`CUT;` など。終端 `;` 付き）。キューを通さず即送信 */
  sendText(text: string): void {
    if (!this.up) return;
    this.write(text);
  }

  on(ev: 'param', cb: (a: Addr, bytes: number[]) => void): Unsub;
  on(ev: 'state', cb: (s: LinkState, err?: LinkError) => void): Unsub;
  on(ev: 'log', cb: (e: LogEntry) => void): Unsub;
  on(ev: 'err', cb: (code: number) => void): Unsub;
  on(ev: 'rtt', cb: (ms: number) => void): Unsub;
  on(ev: 'text', cb: (text: string) => void): Unsub;
  on(ev: 'param' | 'state' | 'log' | 'err' | 'rtt' | 'text', cb: (...args: never[]) => void): Unsub {
    const set = (
      ev === 'param' ? this.paramCbs : ev === 'state' ? this.stateCbs : ev === 'log' ? this.logCbs : ev === 'err' ? this.errCbs : ev === 'text' ? this.textCbs : this.rttCbs
    ) as Set<(...args: never[]) => void>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }

  // ---- セッション確立 ----------------------------------------------------

  private async openSession(): Promise<ConnectResult> {
    const target = this.target!;
    const host = target.host ?? '';
    const port = target.port ?? DEFAULT_LAN_PORT;
    this.emitState('connecting');
    this.log('info', `TCP 接続 ${host}:${port}`);

    let socket: RawSocket;
    try {
      socket = await this.factory.connect(host, port, this.opt.connectTimeoutMs);
    } catch (e) {
      const code = classifySocketError(e);
      throw this.fail(code, String((e as Error)?.message ?? e));
    }
    if (this.closing) {
      socket.destroy();
      throw new LinkFailure('LINK_LOST', 'closing');
    }
    this.socket = socket;
    this.parser.reset();
    this.passwordSent = false;
    socket.onData((text) => this.onData(text));
    socket.onClose((hadError) => this.onClose(hadError));
    socket.onError((err) => this.log('info', `socket error: ${err.message}`));

    this.emitState('authenticating');
    try {
      const first = await this.waitPrompt();
      if (first === 'prompt') {
        if (!this.passwordSent) {
          this.passwordSent = true;
          this.write(`${target.password ?? ''}\n`, '••••');
        }
        const welcome = await this.waitWelcome();
        this.log('info', `認証 OK（${welcome}）`);
      } else {
        this.log('info', '認証プロンプト無し：VER 応答ありのため認証不要として続行【推測による防御】');
      }
      const ver = await this.requestVer();
      const profile = profileFromVerName(ver.model);
      if (!profile) throw this.fail('WRONG_DEVICE', `未対応機種 ${ver.model}`);
      if (target.model && target.model !== profile.model) throw this.fail('WRONG_DEVICE', `保存済み ${target.model} ≠ ${profile.model}`);
      this.model = profile.model;
      this.textMap = profile.protocol === 'text' ? textMapFor(profile.model) : null;
      this.textEchoes = [];
      this.shadow.clear();
      if (this.textMap) this.log('info', `テキストコマンド機種（${profile.model}）：DTH/RQH は使わず 3 文字コマンドに変換`);
      this.up = true;
      this.attempt = 0;
      this.touchIdle();
      this.emitState('syncing');
      return { model: profile.model, version: ver.version };
    } catch (e) {
      const failure = e instanceof LinkFailure ? e : new LinkFailure('NO_RESPONSE', String(e));
      this.socket = null;
      socket.destroy();
      throw failure;
    }
  }

  private waitPrompt(): Promise<'prompt' | 'ver'> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // 5s 以内にプロンプトが来ない → VER を送って応答があれば認証不要
        this.promptWaiter = null;
        // 認証プロンプトを出さない機種（V-60HD / V-600UHD / VR-50HD MK II）：stx 付きと無しの両方で VER を送る
        // （V-60HD / VR-50HD MK II は stx 付き、V-600UHD は LAN では stx 無し【事実：各 Reference Manual】）
        this.write(VER_COMMAND);
        this.write('\x02VER;', '\\x02VER;');
        const t2 = setTimeout(() => {
          this.verWaiter = null;
          reject(this.fail('NO_RESPONSE', 'prompt/VER とも無応答'));
        }, this.opt.verTimeoutMs);
        this.verWaiter = {
          resolve: () => {
            clearTimeout(t2);
            this.verWaiter = null;
            resolve('ver');
          },
          reject: (err) => {
            clearTimeout(t2);
            reject(err);
          },
          timer: t2,
        };
      }, this.opt.promptTimeoutMs);
      this.promptWaiter = {
        resolve: (v) => {
          clearTimeout(timer);
          this.promptWaiter = null;
          resolve(v);
        },
        reject: (err) => {
          clearTimeout(timer);
          this.promptWaiter = null;
          reject(err);
        },
        timer,
      };
    });
  }

  private waitWelcome(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.welcomeWaiter = null;
        reject(this.fail('AUTH_FAILED', 'Welcome 無し'));
      }, this.opt.authTimeoutMs);
      this.welcomeWaiter = {
        resolve: (v) => {
          clearTimeout(timer);
          this.welcomeWaiter = null;
          resolve(v);
        },
        reject: (err) => {
          clearTimeout(timer);
          this.welcomeWaiter = null;
          reject(err);
        },
        timer,
      };
    });
  }

  private requestVer(): Promise<{ model: string; version: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.verWaiter = null;
        reject(this.fail('NO_RESPONSE', 'VER 無応答'));
      }, this.opt.verTimeoutMs);
      this.verWaiter = {
        resolve: (v) => {
          clearTimeout(timer);
          this.verWaiter = null;
          resolve(v);
        },
        reject: (err) => {
          clearTimeout(timer);
          this.verWaiter = null;
          reject(err);
        },
        timer,
      };
      this.verSentAt = Date.now();
      this.writeVer();
    });
  }

  /** VER（テキストモードは機種の stx 規則に合わせる） */
  private writeVer(): void {
    if (this.textMap) this.write(`${this.textMap.stx ? '\x02' : ''}VER;`, 'VER;');
    else this.write(VER_COMMAND);
  }

  private rejectWaiters(err: LinkFailure): void {
    this.promptWaiter?.reject(err);
    this.welcomeWaiter?.reject(err);
    this.verWaiter?.reject(err);
    this.promptWaiter = null;
    this.welcomeWaiter = null;
    this.verWaiter = null;
  }

  // ---- 受信 --------------------------------------------------------------

  private onData(text: string): void {
    this.touchIdle();
    // 接続確認が終わるまで（認証プロンプト〜VER 応答）は受信チャンクを生のまま残す。
    // §13 の「ACK の実体（06H か文字列か）」「stx / LF の有無」「プロンプト文字列」を実機で確定するための証跡
    if (!this.up) this.log('rx', `raw ${escapeControl(text)}`);
    for (const tok of this.parser.feed(text)) {
      if (tok.kind === 'ack') {
        this.log('rx', 'ACK（06H）');
        this.onTextAck();
        continue;
      }
      const msg = parseLanMessage(tok.text);
      if (this.textMap && msg.type !== 'ver' && msg.type !== 'err' && msg.type !== 'ack' && msg.type !== 'prompt' && msg.type !== 'welcome') {
        this.log('rx', tok.text);
        const decoded = this.textMap.decode(tok.text.trim(), this.lastQuery);
        if (decoded.length > 0) {
          for (const d of decoded) this.emitParam(d.addr, d.bytes);
        } else {
          for (const cb of this.textCbs) cb(msg.type === 'unknown' ? msg.raw : tok.text);
        }
        continue;
      }
      switch (msg.type) {
        case 'prompt':
          this.log('rx', tok.text);
          if (this.promptWaiter) this.promptWaiter.resolve('prompt');
          else if (this.up) {
            // 接続中に再度プロンプト＝本体側でセッションが初期化された
            this.log('info', '認証プロンプトを再受信：再接続します');
            this.socket?.destroy();
          }
          break;
        case 'welcome':
          this.log('rx', tok.text);
          this.welcomeWaiter?.resolve(msg.model);
          break;
        case 'ver': {
          this.log('rx', tok.text);
          if (this.verSentAt > 0) {
            const rtt = Date.now() - this.verSentAt;
            this.verSentAt = 0;
            for (const cb of this.rttCbs) cb(rtt);
          }
          this.stopKeepAliveReply();
          if (this.verWaiter) this.verWaiter.resolve({ model: msg.model, version: msg.version });
          break;
        }
        case 'dth':
          this.log('rx', tok.text);
          this.emitParam(msg.addr, msg.bytes);
          break;
        case 'err':
          this.log('rx', `${tok.text}（${ERR_TEXT[msg.code] ?? '不明'}）`);
          for (const cb of this.errCbs) cb(msg.code);
          break;
        case 'ack':
          this.log('rx', `ACK（文字列 "${tok.text}"）`);
          this.onTextAck();
          break;
        default:
          this.log('rx', msg.raw);
          for (const cb of this.textCbs) cb(msg.raw);
          break;
      }
    }
  }

  private onClose(hadError: boolean): void {
    const wasUp = this.up;
    this.up = false;
    this.socket = null;
    this.stopKeepAlive();
    this.queue.clear();
    if (this.closing) return;
    if (!wasUp) {
      // 認証中の切断：パスワード誤りで本体が切る挙動を AUTH_FAILED に寄せる
      const err = this.passwordSent ? new LinkFailure('AUTH_FAILED', 'closed during auth') : new LinkFailure('NO_RESPONSE', 'closed before prompt');
      this.rejectWaiters(err);
      return;
    }
    this.log('info', hadError ? '接続エラーで切断' : '本体側から切断');
    this.scheduleReconnect();
  }

  // ---- 再接続 ------------------------------------------------------------

  private scheduleReconnect(): void {
    if (this.closing || !this.target) return;
    const delay = this.opt.backoffMs[Math.min(this.attempt, this.opt.backoffMs.length - 1)] ?? 15000;
    this.attempt += 1;
    this.emitState('reconnecting', 'LINK_LOST');
    this.log('info', `${delay / 1000}s 後に再接続（${this.attempt} 回目）`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSession().catch((e: unknown) => {
        const code = e instanceof LinkFailure ? e.code : 'NO_RESPONSE';
        if (this.closing) return;
        if (code === 'AUTH_FAILED' || code === 'WRONG_DEVICE') {
          this.emitState('error', code);
          return;
        }
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  // ---- キープアライブ ----------------------------------------------------

  private touchIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.up) return;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (!this.up) return;
      this.verSentAt = Date.now();
      this.writeVer();
      this.keepAliveTimer = setTimeout(() => {
        this.keepAliveTimer = null;
        if (!this.up) return;
        this.log('info', 'キープアライブ無応答：切断扱い');
        this.socket?.destroy();
      }, this.opt.keepAliveReplyMs);
    }, this.opt.keepAliveIdleMs);
  }

  private stopKeepAliveReply(): void {
    if (this.keepAliveTimer) clearTimeout(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  private stopKeepAlive(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.stopKeepAliveReply();
  }

  // ---- 送信 --------------------------------------------------------------

  private sendCommand(cmd: QueuedCommand): void {
    if (this.textMap) {
      const stx = this.textMap.stx ? '\x02' : '';
      if (cmd.kind === 'write') {
        const r = this.textMap.encodeWrite(cmd.addr, cmd.bytes, (a) => this.shadow.get(a));
        if (!r.command) return;
        if (r.echo) this.textEchoes.push(r.echo);
        this.write(`${stx}${r.command}`, r.command);
      } else {
        const q = this.textMap.encodeRead(cmd.addr);
        if (!q) return;
        // 同じ問い合わせの連投（複数の仮想アドレスが 1 つの QPL に集約される）は 300ms に 1 回
        if (q === this.lastQuery && Date.now() - this.lastQueryAt < 300) return;
        this.lastQuery = q;
        this.lastQueryAt = Date.now();
        this.write(`${stx}${q}`, q);
      }
      return;
    }
    if (cmd.kind === 'write') {
      for (const line of formatDthBytes(cmd.addr, cmd.bytes)) this.write(line);
    } else {
      this.write(formatRqh(cmd.addr, cmd.size));
    }
  }

  /** テキストモード：ACK で直前の書込を確定（本体は echo しない） */
  private onTextAck(): void {
    if (!this.textMap) return;
    const e = this.textEchoes.shift();
    if (e) this.emitParam(e.addr, e.bytes);
  }

  private emitParam(a: Addr, bytes: number[]): void {
    bytes.forEach((b, i) => this.shadow.set(a + i, b));
    for (const cb of this.paramCbs) cb(a, bytes);
  }

  private write(text: string, logAs?: string): void {
    const s = this.socket;
    if (!s) return;
    try {
      s.write(text);
      this.log('tx', logAs ?? text.replace(/\n$/, ''));
      this.touchIdle();
    } catch (e) {
      this.log('info', `送信失敗: ${String((e as Error)?.message ?? e)}`);
    }
  }

  // ---- 共通 --------------------------------------------------------------

  private fail(code: LinkError, detail: string): LinkFailure {
    this.log('info', `${code}: ${detail}`);
    return new LinkFailure(code, detail);
  }

  private emitState(s: LinkState, err?: LinkError): void {
    this.state = s;
    for (const cb of this.stateCbs) cb(s, err);
  }

  private log(dir: LogEntry['dir'], text: string): void {
    const e: LogEntry = { ts: Date.now(), dir, text };
    for (const cb of this.logCbs) cb(e);
  }
}

/** 制御文字を可視化する（06H → `<06>`、LF → `<0A>`、stx → `<02>`）。診断ログの生チャンク表示用 */
export function escapeControl(text: string): string {
  let out = '"';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 0x20 || c === 0x7f || c === 0xff) out += `<${c.toString(16).toUpperCase().padStart(2, '0')}>`;
    else out += ch;
  }
  return `${out}"`;
}
