import * as net from 'net';
import type { RawSocket, SocketFactory } from './socket';

/**
 * Node の net による SocketFactory（結合テスト・開発用）。実機アプリでは使わない。
 */
export const nodeSocketFactory: SocketFactory = {
  connect(host, port, timeoutMs) {
    return new Promise<RawSocket>((resolve, reject) => {
      let settled = false;
      const sock = net.createConnection({ host, port });
      sock.setEncoding('latin1');
      sock.setNoDelay(true);
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        sock.destroy();
        reject(Object.assign(new Error('connect timed out'), { code: 'ETIMEDOUT' }));
      }, timeoutMs);
      sock.once('connect', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(wrap(sock));
      });
      sock.once('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  },
};

function wrap(sock: net.Socket): RawSocket {
  let dataCb: ((t: string) => void) | null = null;
  let closeCb: ((hadError: boolean) => void) | null = null;
  let errorCb: ((e: Error) => void) | null = null;
  sock.on('data', (chunk: string | Buffer) => dataCb?.(typeof chunk === 'string' ? chunk : chunk.toString('latin1')));
  sock.on('error', (e) => errorCb?.(e));
  sock.on('close', (hadError) => closeCb?.(hadError));
  return {
    write(text) {
      sock.write(text, 'latin1');
    },
    destroy() {
      sock.destroy();
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
