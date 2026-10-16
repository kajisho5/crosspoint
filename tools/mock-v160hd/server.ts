import * as net from 'net';
import { buildDemoState, writeTally, type ByteMap } from '../../core/transport/demoState';
import { simulateSimpleCommand } from '../../core/transport/simpleCommandSim';
import { addr, addrOffset, addrToHex, decodeTime, decodeU14, encodeU14, type Addr } from '../../core/codec/value';
import { getProfile, modelIdFrom } from '../../core/profiles';
import { simulateTextModel, seedTextModel } from '../../core/transport/textModelSim';
import type { DeviceProfile, ModelId } from '../../core/profiles/types';

/**
 * V-160HD / V-80HD / VR-120HD / VR-6HD / V-1-4K の LAN モックサーバー（SPEC §12-1）。`npm run mock [-- --model v80hd|vr120hd|vr6hd|v14k --port 8023 --password 0000 --jitter --split]`
 * - 接続直後 `Enter password:`、正しい PW で `Welcome to {機種}.`、誤りは切断
 * - `VER;` → `VER:{機種},{版}\n`
 * - `RQH` → 疎メモリから連結 hex で `DTH:…;`
 * - `DTH` → 書込み＋ACK 返信＋他クライアントへ自発通知（V-80HD は自発通知なし）
 * - `0C0100=01` 受信後、PGM/PST 変更時に `DTH:0C0000,{N byte}` を購読者へ送信（V-160HD）
 * - `0B001E`（CUT）押下→解放で PGM/PST 入替、`0B001F`（AUTO）で MIX/WIPE TIME 後に入替（V-160HD）
 * - V-80HD：PW 8 文字、書込応答 `\x02ACK;`、0B 領域は `ERR:0;`（不明を再現）
 * - 範囲外書込みは `ERR:5;`
 * - `--jitter`：ランダム遅延、`--split`：応答を 2 分割送信（パーサ検証用）
 * 本体の実挙動が【不明】な部分は SPEC の記述どおりに作ってあり、実機確認（§13）で修正する。
 */

export interface MockServerOptions {
  model?: ModelId;
  port?: number;
  password?: string;
  jitter?: boolean;
  split?: boolean;
  /** V-160HD の ACK 形式：'ascii' = `ACK;`、'byte06' = 0x06 */
  ack?: 'ascii' | 'byte06';
  log?: (line: string) => void;
}

export interface MockServer {
  port: number;
  profile: DeviceProfile;
  mem: ByteMap;
  clientCount: () => number;
  /** 本体側の操作を模擬（パネル操作）：書込み＋全クライアントへ自発通知 */
  panelWrite: (a: Addr, bytes: number[]) => void;
  close: () => Promise<void>;
}

const VERSIONS: Record<ModelId, string> = { 'V-160HD': '3.60', 'V-80HD': '1.30', 'VR-120HD': '2.00', 'VR-6HD': '2.20', 'V-1-4K': '1.00', 'V-8HD': '3.00', 'V-1HD': '2.10', 'V-1SDI': '1.50', 'VR-4HD': '2.10', 'V-02HD-MK2': '1.03', 'V-60HD': '3.10', 'V-600UHD': '3.00', 'VR-50HD-MK2': '2.00' };
const TALLY_SUBSCRIBE = addr(0x0c, 0x01, 0x00);

function hex2(b: number): string {
  return b.toString(16).toUpperCase().padStart(2, '0');
}

export async function startMockServer(options: MockServerOptions = {}): Promise<MockServer> {
  const model = options.model ?? 'V-160HD';
  const profile = getProfile(model);
  const password = options.password ?? (profile.passwordLength === 4 ? '0000' : '00000000');
  const log = options.log ?? (() => {});
  const mem = buildDemoState(profile);
  const pressed = new Set<Addr>();
  const seqState = { on: false, auto: false };
  const subscribers = new Set<net.Socket>();
  const clients = new Map<net.Socket, { authed: boolean; buf: string }>();
  // PGM/PST に書ける最大値 = INPUT n の最後（V-160HD 0x33 / V-80HD 0x38 / VR-120HD 0x24 / VR-6HD 0x1C / V-1-4K 0x0F=BLACK）
  const maxPgmValue = model === 'V-1-4K' ? 0x0f : profile.encodeInput(profile.inputCount);

  const send = (sock: net.Socket, text: string) => {
    if (sock.destroyed) return;
    const go = () => {
      if (options.split && text.length > 2) {
        const cut = Math.floor(text.length / 2);
        sock.write(text.slice(0, cut), 'latin1');
        setTimeout(() => !sock.destroyed && sock.write(text.slice(cut), 'latin1'), 3);
      } else {
        sock.write(text, 'latin1');
      }
    };
    if (options.jitter) setTimeout(go, Math.floor(Math.random() * 40));
    else go();
  };
  // V-80HD / V-1-4K：ガイドの表記は `stxACK;`（文字列）。それ以外は制御コード 06H または `ACK;`
  const ackText = model === 'V-80HD' || model === 'V-1-4K' ? '\x02ACK;' : options.ack === 'byte06' ? '\x06' : 'ACK;';

  const readBytes = (a: Addr, size: number) => Array.from({ length: size }, (_, i) => mem.get(addrOffset(a, i)) ?? 0);
  const dthText = (a: Addr, bytes: number[]) => `DTH:${addrToHex(a)},${bytes.map(hex2).join('')};`;

  const notify = (a: Addr, bytes: number[], except?: net.Socket) => {
    if (model !== 'V-160HD') return; // V-80HD：自発通知の有無は【不明】→ 送らない
    for (const [sock, st] of clients) if (st.authed && sock !== except) send(sock, dthText(a, bytes));
  };
  const notifyTally = () => {
    if (profile.addrs.tallyBlock == null) return;
    writeTally(mem, profile);
    const bytes = readBytes(profile.addrs.tallyBlock, profile.addrs.tallyBlockSize);
    for (const sock of subscribers) send(sock, dthText(profile.addrs.tallyBlock, bytes));
  };
  const setBytes = (a: Addr, bytes: number[], except?: net.Socket) => {
    bytes.forEach((b, i) => mem.set(addrOffset(a, i), b));
    notify(a, bytes, except);
    if (a === profile.addrs.pgm || a === profile.addrs.pst) notifyTally();
  };
  const swapPgmPst = (except?: net.Socket) => {
    if (profile.addrs.pst == null) return;
    const pgm = mem.get(profile.addrs.pgm) ?? 0;
    const pst = mem.get(profile.addrs.pst) ?? 0;
    setBytes(profile.addrs.pgm, [pst], except);
    setBytes(profile.addrs.pst, [pgm], except);
  };

  /** 1 バイト書込みの処理。戻り値は応答文字列 */
  const handleWrite = (sock: net.Socket, a: Addr, v: number): string => {
    const a1 = (a >> 14) & 0x7f;
    if (a1 === 0x0b) {
      if (model !== 'V-160HD') return 'ERR:0;';
      if (a === profile.addrs.cut) {
        if (v === 1 && !pressed.has(a)) {
          pressed.add(a);
          swapPgmPst(sock);
        } else if (v === 0) pressed.delete(a);
        return ackText;
      }
      if (a === profile.addrs.auto) {
        if (v === 1) {
          const ms = decodeTime([mem.get(profile.addrs.transTime) ?? 10]) * 1000;
          setTimeout(() => swapPgmPst(), Math.max(ms, 5));
        }
        return ackText;
      }
      return ackText; // 他のパネルスイッチは受理のみ
    }
    if (a === TALLY_SUBSCRIBE) {
      if (model !== 'V-160HD') return 'ERR:0;'; // 【不明】を再現
      if (v === 1) subscribers.add(sock);
      else subscribers.delete(sock);
      return ackText;
    }
    if (a === profile.addrs.memLoad) {
      if (v >= profile.memoryCount) return 'ERR:5;';
      if (profile.addrs.memCurrent != null) setBytes(profile.addrs.memCurrent, [v], undefined);
      return ackText;
    }
    if ((a === profile.addrs.pgm || a === profile.addrs.pst) && v > maxPgmValue) return 'ERR:5;';
    if (a === profile.addrs.transType && v > 1) return 'ERR:5;';
    if (a === profile.addrs.transTime && v > 0x28) return 'ERR:5;';
    setBytes(a, [v], sock);
    // Fader Base を持つ機種（V-80HD / VR-120HD）：Level が最大に達したら遷移完了（PGM/PST 入替、Level 0、Base 反転。実機観測）
    const fa = profile.addrs.fader;
    const fb = profile.addrs.faderBase;
    if (fa != null && fb != null && a === addrOffset(fa, 1) && decodeU14(readBytes(fa, 2)) >= profile.faderMax) {
      swapPgmPst();
      setBytes(fa, encodeU14(0));
      setBytes(fb, [(mem.get(fb) ?? 0) === 1 ? 0 : 1]);
    }
    return ackText;
  };

  const textModel = profile.protocol === 'text';
  // テキストコマンド機種の応答形式：V-60HD / VR-50HD MK II は stx 付き＋ack 06H、V-600UHD は stx 無し＋"ACK"+LF
  const textStx = model === 'V-600UHD' ? '' : '\x02';
  const textAck = model === 'V-600UHD' ? 'ACK\n' : '\x06';
  if (textModel) seedTextModel(profile, mem);

  const handleTextLine = (sock: net.Socket, line: string) => {
    if (line === 'VER') {
      send(sock, `${textStx}VER:${profile.verName},${VERSIONS[model]};`);
      return;
    }
    const replies = simulateTextModel(profile, line, mem, { later: (fn, ms) => void setTimeout(fn, ms) });
    for (const r of replies) send(sock, r === 'ACK' ? textAck : `${textStx}${r}`);
  };

  const handleLine = (sock: net.Socket, st: { authed: boolean; buf: string }, raw: string) => {
    const line = raw.trim();
    if (line.length === 0) return;
    if (textModel) {
      handleTextLine(sock, line);
      return;
    }
    if (!st.authed) {
      if (line === password) {
        st.authed = true;
        send(sock, `Welcome to ${profile.verName}.`);
        log(`auth ok`);
      } else {
        log(`auth NG (${line})`);
        sock.destroy();
      }
      return;
    }
    if (line === 'VER') {
      send(sock, `VER:${profile.verName},${VERSIONS[model]}\n`);
      return;
    }
    const rqh = /^RQH:([0-9A-Fa-f]{6}),([0-9A-Fa-f]{6})$/.exec(line);
    if (rqh) {
      const a = hexAddr(rqh[1] ?? '000000');
      const size = parseInt(rqh[2] ?? '0', 16);
      if (size < 1 || size > 256) {
        send(sock, 'ERR:5;');
        return;
      }
      send(sock, dthText(a, readBytes(a, size)));
      return;
    }
    // 複数バイトは連結（`DTH:010A01,7E58;`）。実機（V-80HD）と同じく先頭番地から順に書く
    const dth = /^DTH:([0-9A-Fa-f]{6}),((?:[0-9A-Fa-f]{2})+)$/.exec(line);
    if (dth) {
      const a = hexAddr(dth[1] ?? '000000');
      const hex = dth[2] ?? '';
      const vals: number[] = [];
      for (let i = 0; i < hex.length; i += 2) vals.push(parseInt(hex.slice(i, i + 2), 16));
      if (vals.some((v) => v > 0x7f)) {
        send(sock, 'ERR:5;');
        return;
      }
      let reply = '';
      vals.forEach((v, i) => {
        reply = handleWrite(sock, addrOffset(a, i), v);
      });
      send(sock, reply);
      return;
    }
    // 簡易制御コマンド（LAN/RS-232 簡易制御コマンド Ver.02）。応答は `;` 区切り＋LF
    const reply = simulateSimpleCommand(line, {
      swap: () => swapPgmPst(),
      autoMs: () => decodeTime([mem.get(profile.addrs.transTime) ?? 10]) * 1000,
      later: (fn, ms) => void setTimeout(fn, ms),
      loadMemory: (n) => {
        if (profile.addrs.memCurrent != null) setBytes(profile.addrs.memCurrent, [n - 1]);
      },
      tally: () => {
        if (profile.addrs.tallyBlock == null) return [];
        writeTally(mem, profile);
        return readBytes(profile.addrs.tallyBlock, profile.addrs.tallyBlockSize);
      },
      seq: { get: () => seqState, set: (v) => { if (v.on != null) seqState.on = v.on; if (v.auto != null) seqState.auto = v.auto; } },
    });
    send(sock, `${reply.join(';')};\n`);
  };

  const server = net.createServer((sock: net.Socket) => {
    sock.setEncoding('latin1');
    sock.setNoDelay(true);
    const st = { authed: textModel, buf: '' };
    clients.set(sock, st);
    log(`client connected (${clients.size})`);
    if (!textModel) send(sock, 'Enter password:'); // テキストコマンド機種は認証プロンプト無し【事実：資料に記載無し】
    sock.on('data', (chunk: string) => {
      st.buf += chunk.replace(/[\x02\r]/g, '');
      for (;;) {
        const i = indexOfSep(st.buf);
        if (i < 0) break;
        const line = st.buf.slice(0, i);
        st.buf = st.buf.slice(i + 1);
        handleLine(sock, st, line);
      }
    });
    sock.on('error', () => {});
    sock.on('close', () => {
      clients.delete(sock);
      subscribers.delete(sock);
      log(`client closed (${clients.size})`);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 8023, '0.0.0.0', () => resolve());
  });
  const port = (server.address() as net.AddressInfo).port;
  log(`${profile.verName} mock listening on ${port} (password ${password})`);

  return {
    port,
    profile,
    mem,
    clientCount: () => clients.size,
    panelWrite: (a, bytes) => setBytes(a, bytes),
    close: () =>
      new Promise<void>((resolve) => {
        for (const sock of clients.keys()) sock.destroy();
        server.close(() => resolve());
      }),
  };
}

function hexAddr(h: string): Addr {
  return addr(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

function indexOfSep(s: string): number {
  const a = s.indexOf(';');
  const b = s.indexOf('\n');
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

function parseArgs(argv: string[]): MockServerOptions {
  const o: MockServerOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--model' && v) {
      o.model = modelIdFrom(v) ?? 'V-160HD';
      i += 1;
    } else if (k === '--port' && v) {
      o.port = Number(v);
      i += 1;
    } else if (k === '--password' && v) {
      o.password = v;
      i += 1;
    } else if (k === '--ack' && v) {
      o.ack = v === '06' || v === 'byte06' ? 'byte06' : 'ascii';
      i += 1;
    } else if (k === '--jitter') o.jitter = true;
    else if (k === '--split') o.split = true;
  }
  return o;
}

const isMain = typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  void startMockServer({ ...opts, log: (l) => console.log(`[mock] ${l}`) }).then((s) => {
    console.log(`[mock] Ctrl+C で終了。接続先: 127.0.0.1:${s.port}`);
  });
}
