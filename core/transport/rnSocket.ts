import TcpSocket from 'react-native-tcp-socket';
import type { RawSocket, SocketFactory } from './socket';

/**
 * react-native-tcp-socket による SocketFactory（実機用）。
 * 受信は文字列（latin1 相当の 1 バイト = 1 文字）で扱う：プロトコルは ASCII ＋ 制御文字のみ（SPEC §3-4）。
 */

function bufferToLatin1(data: string | Uint8Array | ArrayBuffer): string {
  if (typeof data === 'string') return data;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i] ?? 0);
  return s;
}

export const rnSocketFactory: SocketFactory = {
  connect(host, port, timeoutMs) {
    return new Promise<RawSocket>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          client.destroy();
        } catch {
          // 既に閉じている
        }
        reject(Object.assign(new Error('connect timed out'), { code: 'ETIMEDOUT' }));
      }, timeoutMs);

      const client = TcpSocket.createConnection({ host, port, tls: false, connectTimeout: timeoutMs }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.setEncoding('latin1');
        resolve(wrap(client));
      });
      client.on('error', (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  },
};

function wrap(client: ReturnType<typeof TcpSocket.createConnection>): RawSocket {
  let dataCb: ((t: string) => void) | null = null;
  let closeCb: ((hadError: boolean) => void) | null = null;
  let errorCb: ((e: Error) => void) | null = null;
  let hadError = false;
  client.on('data', (data: string | Uint8Array | ArrayBuffer) => dataCb?.(bufferToLatin1(data)));
  client.on('error', (e: Error) => {
    hadError = true;
    errorCb?.(e);
  });
  client.on('close', () => closeCb?.(hadError));
  return {
    write(text) {
      client.write(text, 'latin1');
    },
    destroy() {
      client.destroy();
    },
    onData(cb) {
      dataCb = cb;
    },
    onClose(cb) {
      closeCb = cb;
    },
    onError(cb) {
      errorCb = cb;
    },
  };
}
