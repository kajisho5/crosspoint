import { addr, type Addr } from '../codec/value';

/**
 * 仮想アドレス（SysEx アドレスマップを持たない LAN テキストコマンド機種：V-60HD / V-600UHD / VR-50HD MK II）。
 * アプリの画面・ストア・同期はすべて「アドレス＋バイト列」で動くので、これらの機種ではコマンドを仮想アドレスに
 * 対応付け、LanTransport のテキストモード（core/codec/textCommandMap.ts）が送受信時にコマンドへ変換する。
 * 先頭バイト 7FH は Roland のマップに現れないので実アドレスと衝突しない。
 */
export const VA = {
  pgm: addr(0x7f, 0x00, 0x00),
  pst: addr(0x7f, 0x00, 0x01),
  aux: addr(0x7f, 0x00, 0x02),
  /** 2 バイト（読出しのみの機種あり） */
  fader: addr(0x7f, 0x00, 0x03),
  transType: addr(0x7f, 0x00, 0x05),
  /** 0.1 秒単位 0–40（SysEx 機種の MIX/WIPE TIME と同じ符号化） */
  transTime: addr(0x7f, 0x00, 0x06),
  /** 書くと [CUT] / [AUTO] 押下。値は 1（押下）だけ送り、0（解放）はコマンドにしない */
  cut: addr(0x7f, 0x00, 0x10),
  auto: addr(0x7f, 0x00, 0x11),
  outputFade: addr(0x7f, 0x00, 0x12),
  pinp: (n: number): Addr => addr(0x7f, 0x01, n - 1),
  dskPgm: addr(0x7f, 0x02, 0x00),
  dskPvw: addr(0x7f, 0x02, 0x01),
  memLoad: addr(0x7f, 0x03, 0x00),
  memCurrent: addr(0x7f, 0x03, 0x01),
  /** 入力 x のレベル（db3 = 3 バイト / u7 = 1 バイト）、ミュート */
  audioLevel: (x: number): Addr => addr(0x7f, 0x10 + x, 0x00),
  audioMute: (x: number): Addr => addr(0x7f, 0x10 + x, 0x03),
  masterLevel: addr(0x7f, 0x30, 0x00),
  masterMute: addr(0x7f, 0x30, 0x03),
  /** タリー（1 入力 1 バイト：0 OFF / 1 PGM / 2 PST） */
  tally: addr(0x7f, 0x40, 0x00),
} as const;
