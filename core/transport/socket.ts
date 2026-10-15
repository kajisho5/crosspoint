/**
 * TCP ソケットの最小抽象。LanTransport はこれだけに依存し、
 * 実機では rnSocket.ts（react-native-tcp-socket）、テストでは Node の net を差し込む。
 */

export interface RawSocket {
  write(text: string): void;
  /** 片方向終了ではなく即時破棄 */
  destroy(): void;
  onData(cb: (text: string) => void): void;
  onClose(cb: (hadError: boolean) => void): void;
  onError(cb: (err: Error) => void): void;
}

export interface SocketFactory {
  /** 接続完了で resolve。失敗（拒否・到達不能・タイムアウト）は reject */
  connect(host: string, port: number, timeoutMs: number): Promise<RawSocket>;
}

export type SocketErrorKind = 'REFUSED' | 'TIMEOUT' | 'LOCAL_NETWORK_DENIED' | 'NO_RESPONSE';

/** ソケットエラーを LinkError に寄せる（文言はプラットフォームで異なるので部分一致） */
export function classifySocketError(err: unknown): SocketErrorKind {
  const msg = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
  const code = String((err as { code?: string })?.code ?? '').toUpperCase();
  if (code === 'ECONNREFUSED' || msg.includes('refused')) return 'REFUSED';
  if (code === 'ETIMEDOUT' || msg.includes('timed out') || msg.includes('timeout')) return 'TIMEOUT';
  if (msg.includes('local network') || msg.includes('not permitted') || code === 'EPERM' || code === 'EACCES') return 'LOCAL_NETWORK_DENIED';
  if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH' || msg.includes('unreachable')) return 'NO_RESPONSE';
  return 'NO_RESPONSE';
}
