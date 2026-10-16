import { encodeLevel, encodeU14, addrOffset, type Addr } from '../codec/value';
import { textMapFor } from '../codec/textCommandMap';
import type { DeviceProfile } from '../profiles/types';
import { VA } from '../profiles/virtual';
import { writeTally, type ByteMap } from './demoState';

/**
 * LAN テキストコマンド機種（V-60HD / V-600UHD / VR-50HD MK II）の本体側シミュレーション（デモ・モックサーバー共用）。
 * 受けたコマンド 1 行（stx・終端除去済み）を仮想アドレスのメモリに反映し、返すべき応答を返す。
 * 応答の 'ACK' は呼び出し側が機種の ack 形式（06H / "ACK\n"）に直す。問い合わせ応答はコマンド文字列（`QPL:…;`）。
 */
export interface TextSimHooks {
  later: (fn: () => void, ms: number) => void;
}

function put(m: ByteMap, a: Addr, bytes: number[]): void {
  bytes.forEach((b, i) => m.set(addrOffset(a, i), b));
}

function get(m: ByteMap, a: Addr): number {
  return m.get(a) ?? 0;
}

function tenthsToLevel(v: number): number[] {
  return encodeLevel(v <= -801 ? null : v / 10);
}

function levelTenths(m: ByteMap, a: Addr): number {
  const b = [get(m, a), get(m, a + 1), get(m, a + 2)];
  // decodeLevel 相当（-INF は 7E 00 00）
  if (b[0] === 0x7e && b[1] === 0 && b[2] === 0) return -801;
  let raw = ((b[0] ?? 0) << 14) | ((b[1] ?? 0) << 7) | (b[2] ?? 0);
  if (raw & 0x100000) raw -= 0x200000;
  return raw;
}

export function simulateTextModel(profile: DeviceProfile, line: string, mem: ByteMap, hooks: TextSimHooks): string[] {
  const m = /^([A-Z0-9]{3,6})(?::(.*))?;?$/.exec(line.trim());
  if (!m) return ['ERR:0;'];
  const cmd = m[1] ?? '';
  const args = (m[2] ?? '').split(',').map((s) => s.trim()).filter((s) => s.length > 0).map(Number);
  const a = args[0];
  const b = args[1];
  const model = profile.model;
  const inRange = (v: number | undefined, lo: number, hi: number): v is number => v !== undefined && Number.isInteger(v) && v >= lo && v <= hi;
  const swap = () => {
    if (profile.addrs.pst == null) return;
    const pgm = get(mem, VA.pgm);
    put(mem, VA.pgm, [get(mem, VA.pst)]);
    put(mem, VA.pst, [pgm]);
    writeTally(mem, profile);
  };
  const maxInput = profile.inputCount - 1;

  switch (cmd) {
    case 'VER':
      return [];
    case 'ACS':
      return ['ACK'];
    case 'PGM':
      if (!inRange(a, 0, maxInput)) return ['ERR:5;'];
      put(mem, VA.pgm, [a]);
      writeTally(mem, profile);
      return ['ACK'];
    case 'PST':
      if (profile.addrs.pst == null) return ['ERR:0;'];
      if (!inRange(a, 0, maxInput)) return ['ERR:5;'];
      put(mem, VA.pst, [a]);
      writeTally(mem, profile);
      return ['ACK'];
    case 'AUX':
      if (!inRange(a, 0, 7)) return ['ERR:5;'];
      put(mem, VA.aux, [a]);
      return ['ACK'];
    case 'TRS':
      if (!inRange(a, 0, profile.transTypes.length - 1)) return ['ERR:5;'];
      put(mem, VA.transType, [a]);
      return ['ACK'];
    case 'TIM':
      if (!inRange(a, 0, 40)) return ['ERR:5;'];
      put(mem, VA.transTime, [a]);
      return ['ACK'];
    case 'CUT':
      if (profile.addrs.cut == null) return ['ERR:0;'];
      swap();
      return ['ACK'];
    case 'ATO': {
      if (profile.addrs.auto == null) return ['ERR:0;'];
      const ms = get(mem, VA.transTime) * 100;
      hooks.later(swap, Math.max(ms, 10));
      return ['ACK'];
    }
    case 'P1S':
      put(mem, VA.pinp(1), [get(mem, VA.pinp(1)) ? 0 : 1]);
      return ['ACK'];
    case 'P2S':
      put(mem, VA.pinp(2), [get(mem, VA.pinp(2)) ? 0 : 1]);
      return ['ACK'];
    case 'DSK':
      put(mem, VA.dskPgm, [get(mem, VA.dskPgm) ? 0 : 1]);
      return ['ACK'];
    case 'DVW':
      put(mem, VA.dskPvw, [get(mem, VA.dskPvw) ? 0 : 1]);
      return ['ACK'];
    case 'FDE':
      if (model === 'V-60HD') {
        put(mem, VA.outputFade, [get(mem, VA.outputFade) ? 0 : 1]);
        return ['ACK'];
      }
      if (!inRange(a, 0, 1)) return ['ERR:5;'];
      put(mem, VA.outputFade, [a]);
      return ['ACK'];
    case 'MEM':
      if (!inRange(a, 0, profile.memoryCount - 1)) return ['ERR:5;'];
      put(mem, VA.memCurrent, [a]);
      return ['ACK'];
    case 'IAL': {
      const n = profile.audioInputs.length - 1;
      if (!inRange(a, 0, n) || !inRange(b, -801, 100)) return ['ERR:5;'];
      put(mem, VA.audioLevel(a), tenthsToLevel(b));
      return ['ACK'];
    }
    case 'OAL':
      if (!inRange(a, -801, 100)) return ['ERR:5;'];
      put(mem, VA.masterLevel, tenthsToLevel(a));
      return ['ACK'];
    case 'OAX':
      return inRange(a, -801, 100) ? ['ACK'] : ['ERR:5;'];
    case 'LM1':
    case 'LM2':
    case 'LM3':
    case 'LM4':
    case 'LS1':
    case 'LS2':
    case 'LS3':
    case 'LS4': {
      if (model !== 'VR-50HD-MK2') return ['ERR:0;'];
      if (!inRange(a, 0, 127)) return ['ERR:5;'];
      const idx = (cmd.startsWith('LM') ? 0 : 4) + Number(cmd[2]) - 1;
      put(mem, VA.audioLevel(idx), [a]);
      return ['ACK'];
    }
    case 'LMN':
      if (model !== 'VR-50HD-MK2') return ['ERR:0;'];
      if (!inRange(a, 0, 127)) return ['ERR:5;'];
      put(mem, VA.masterLevel, [a]);
      return ['ACK'];
    case 'QPL': {
      if (model !== 'V-60HD') return ['ERR:0;'];
      const vals = [get(mem, VA.pgm), get(mem, VA.pst), get(mem, VA.aux), get(mem, VA.pinp(1)), get(mem, VA.dskPgm), get(mem, VA.outputFade), 0];
      if (a === 7 || a === undefined) return [`QPL:${vals.join(',')};`, 'ACK'];
      if (!inRange(a, 0, 6)) return ['ERR:5;'];
      return [`QPL:${vals[a]};`, 'ACK'];
    }
    case 'TLY': {
      if (model !== 'V-60HD') return ['ERR:0;'];
      writeTally(mem, profile);
      const t = Array.from({ length: 8 }, (_, i) => get(mem, VA.tally + i));
      return [`TLY:${t.join(',')};`, 'ACK'];
    }
    case 'QAL': {
      if (model !== 'V-60HD') return ['ERR:0;'];
      if (a === 13 || a === undefined) {
        const vals = Array.from({ length: 11 }, (_, x) => levelTenths(mem, VA.audioLevel(x)));
        vals.push(0, levelTenths(mem, VA.masterLevel));
        return [`QAL:${vals.join(',')};`, 'ACK'];
      }
      if (inRange(a, 0, 10)) return [`QAL:${levelTenths(mem, VA.audioLevel(a))};`, 'ACK'];
      if (a === 12) return [`QAL:${levelTenths(mem, VA.masterLevel)};`, 'ACK'];
      return ['ERR:5;'];
    }
    case 'QPG':
      if (model !== 'VR-50HD-MK2') return ['ERR:0;'];
      return [`QPG:${get(mem, VA.pgm)};`];
    default:
      return ['ERR:0;'];
  }
}

/** モックサーバーの初期状態（buildDemoState で埋まらない仮想アドレスだけ） */
export function seedTextModel(profile: DeviceProfile, mem: ByteMap): void {
  if (!mem.has(VA.aux)) put(mem, VA.aux, [0]);
  if (!mem.has(VA.fader)) put(mem, VA.fader, encodeU14(0));
  if (!mem.has(VA.outputFade)) put(mem, VA.outputFade, [0]);
  if (!mem.has(VA.memCurrent)) put(mem, VA.memCurrent, [0]);
  if (profile.addrs.pst == null && !mem.has(VA.pst)) put(mem, VA.pst, [0]);
}

export function isTextModel(profile: DeviceProfile): boolean {
  return profile.protocol === 'text' && textMapFor(profile.model) != null;
}
