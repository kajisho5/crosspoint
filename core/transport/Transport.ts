import type { Addr } from '../codec/value';
import type { ModelId } from '../profiles/types';

/** SPEC §8-3 */
export type TransportKind = 'lan' | 'usb' | 'ble' | 'mock';

export type LinkState = 'idle' | 'connecting' | 'authenticating' | 'syncing' | 'online' | 'reconnecting' | 'error';

export type LinkError =
  | 'AUTH_FAILED'
  | 'NO_RESPONSE'
  | 'WRONG_DEVICE'
  | 'REFUSED'
  | 'TIMEOUT'
  | 'LOCAL_NETWORK_DENIED'
  | 'MIDI_OPEN_FAILED'
  | 'LINK_LOST';

export interface LogEntry {
  ts: number;
  dir: 'tx' | 'rx' | 'info';
  text: string;
}

export interface ConnectTarget {
  name: string;
  /** モック・保存済み機器の機種（実機では VER 応答で確定する） */
  model?: ModelId;
  host?: string;
  port?: number;
  password?: string;
  midiDestUniqueId?: number;
  midiSrcUniqueId?: number;
}

export interface ConnectResult {
  model: ModelId;
  version: string;
}

export type Unsub = () => void;

export interface Transport {
  readonly kind: TransportKind;
  /** 認証・機種確認まで含めて resolve */
  connect(target: ConnectTarget): Promise<ConnectResult>;
  disconnect(reason?: string): Promise<void>;
  /** LAN: 1byte ずつ DTH / MIDI: DT1 一括 */
  writeParam(a: Addr, bytes: number[]): void;
  /** LAN: RQH / MIDI: RQ1 */
  readParam(a: Addr, size: number): void;
  on(ev: 'param', cb: (a: Addr, bytes: number[]) => void): Unsub;
  on(ev: 'state', cb: (s: LinkState, err?: LinkError) => void): Unsub;
  on(ev: 'log', cb: (e: LogEntry) => void): Unsub;
}

/** LinkError ごとの日本語メッセージ（SPEC §11 S0） */
export const LINK_ERROR_MESSAGE: Record<LinkError, string> = {
  AUTH_FAILED: 'パスワードが違います。本体の NETWORK PASSWORD を確認してください。',
  NO_RESPONSE: '本体から応答がありません。IP アドレスと本体の LAN 設定を確認してください。',
  WRONG_DEVICE: '対応していない機種、または保存済みと異なる機種です。',
  REFUSED: '接続を拒否されました。ポート番号と、他の機器が接続していないか確認してください。',
  TIMEOUT: '接続がタイムアウトしました。同じネットワークにいるか確認してください。',
  LOCAL_NETWORK_DENIED: 'ローカルネットワークへのアクセスが許可されていません。設定 > プライバシーとセキュリティ > ローカルネットワーク で許可してください。',
  MIDI_OPEN_FAILED: 'MIDI 接続を開けませんでした。ケーブルまたは Bluetooth の接続を確認してください。',
  LINK_LOST: '接続が切れました。再接続しています。',
};
