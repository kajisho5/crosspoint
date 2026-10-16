import { VA } from '../profiles/virtual';
import type { ModelId } from '../profiles/types';
import { decodeLevel, encodeLevel, encodeU14, type Addr } from './value';

/**
 * LAN テキストコマンド機種（V-60HD / V-600UHD / VR-50HD MK II）の「仮想アドレス ⇄ コマンド」対応。
 * 根拠（公式 Reference Manual の Command Reference。転記：tools/guide/notes/{v60hd,v600uhd,vr50hdmk2}.md）：
 *  - V-60HD v3.1 p.20–23：`stxPGM:a;` 等、ack = 06H、問い合わせ QPL / TLY / QAL / VER
 *  - V-600UHD eng07 p.57–59：LAN では stx を付けない、ack = "ACK"+LF、読出しは VER のみ
 *  - VR-50HD MK II eng02 p.60–62：stx 付き、ack = 06H、問い合わせ QPG / VER
 * 書式は 3 文字コマンド＋10 進引数。引数の値域はコマンドごとに違うので、ここで機種ごとに変換する。
 */

export interface TextWriteResult {
  /** 送るコマンド（stx・終端は送信側が付ける）。null = この機種では対応コマンド無し */
  command: string | null;
  /** 本体が値を echo しないので、ACK を受けたらこの値で確定扱いにする */
  echo: { addr: Addr; bytes: number[] } | null;
}

export interface TextCommandMap {
  /** コマンド先頭に stx（02H）を付ける */
  stx: boolean;
  /** 書込：仮想アドレス＋バイト列 → コマンド。current は既知の現在値（トグル系コマンドの判断用） */
  encodeWrite(addr: Addr, bytes: number[], current: (a: Addr) => number | undefined): TextWriteResult;
  /** 読出：仮想アドレス → 問い合わせコマンド（null = 読めない） */
  encodeRead(addr: Addr): string | null;
  /** 応答行（stx・終端除去済み）→ 仮想アドレスの値。該当しなければ空配列 */
  decode(line: string, lastQuery: string | null): { addr: Addr; bytes: number[] }[];
}

function int(s: string | undefined): number | null {
  if (s === undefined) return null;
  const v = Number(s.trim());
  return Number.isFinite(v) ? v : null;
}

/** 3 バイトレベル → 0.1 dB 単位の整数（-INF = -801） */
function levelToTenths(bytes: number[]): number {
  const db = decodeLevel(bytes);
  return db == null ? -801 : Math.round(db * 10);
}

function tenthsToLevel(v: number): number[] {
  return encodeLevel(v <= -801 ? null : v / 10);
}

function level3At(addr: Addr, base: Addr): boolean {
  return addr === base;
}

// ---- V-60HD ----------------------------------------------------------------

/** QPL:7（ALL）の並び：PGM, PST, AUX, PinP/SPLIT, DSK, OUTPUT FADE, (フェーダー)。資料の例は 6 値【不明：7 値目の有無】 */
export const V60HD_QPL_ORDER = ['pgm', 'pst', 'aux', 'pinp', 'dsk', 'fade', 'fader'] as const;

export const v60hdMap: TextCommandMap = {
  stx: true,
  encodeWrite(addr, bytes, current) {
    const v = bytes[0] ?? 0;
    const echo = { addr, bytes };
    if (addr === VA.pgm) return { command: `PGM:${v};`, echo };
    if (addr === VA.pst) return { command: `PST:${v};`, echo };
    if (addr === VA.aux) return { command: `AUX:${v};`, echo };
    if (addr === VA.transType) return { command: `TRS:${v};`, echo };
    if (addr === VA.transTime) return { command: `TIM:${v};`, echo };
    if (addr === VA.cut) return v === 1 ? { command: 'CUT;', echo: null } : { command: null, echo: null };
    if (addr === VA.auto) return v === 1 ? { command: 'ATO;', echo: null } : { command: null, echo: null };
    // トグル系：現在値が分かっていて同じなら送らない（P1S/P2S/DSK/DVW はボタン押下＝反転）
    if (addr === VA.pinp(1) || addr === VA.pinp(2)) {
      const cur = current(addr);
      if (cur !== undefined && cur === v) return { command: null, echo: null };
      return { command: addr === VA.pinp(1) ? 'P1S;' : 'P2S;', echo };
    }
    if (addr === VA.dskPgm) {
      const cur = current(addr);
      if (cur !== undefined && cur === v) return { command: null, echo: null };
      return { command: 'DSK;', echo };
    }
    if (addr === VA.dskPvw) return { command: 'DVW;', echo };
    if (addr === VA.memLoad) return { command: `MEM:${v};`, echo: null };
    for (let x = 0; x <= 10; x += 1) {
      if (level3At(addr, VA.audioLevel(x))) return { command: `IAL:${x},${levelToTenths(bytes)};`, echo };
    }
    if (addr === VA.masterLevel) return { command: `OAL:${levelToTenths(bytes)};`, echo };
    return { command: null, echo: null };
  },
  encodeRead(addr) {
    if (addr === VA.pgm || addr === VA.pst || addr === VA.aux || addr === VA.pinp(1) || addr === VA.dskPgm || addr === VA.transType) return 'QPL:7;';
    if (addr === VA.tally) return 'TLY;';
    for (let x = 0; x <= 10; x += 1) if (addr === VA.audioLevel(x)) return `QAL:${x};`;
    if (addr === VA.masterLevel) return 'QAL:12;';
    return null;
  },
  decode(line, lastQuery) {
    const m = /^([A-Z]{3}):(.*)$/.exec(line);
    if (!m) return [];
    const args = (m[2] ?? '').replace(/;$/, '').split(',').map((s) => s.trim());
    if (m[1] === 'QPL') {
      const out: { addr: Addr; bytes: number[] }[] = [];
      const vals = args.map(int);
      const put = (addr: Addr, v: number | null) => {
        if (v != null) out.push({ addr, bytes: [v & 0x7f] });
      };
      put(VA.pgm, vals[0] ?? null);
      put(VA.pst, vals[1] ?? null);
      put(VA.aux, vals[2] ?? null);
      put(VA.pinp(1), vals[3] ?? null);
      put(VA.dskPgm, vals[4] ?? null);
      put(VA.outputFade, vals[5] ?? null);
      const f = vals[6];
      if (f != null) out.push({ addr: VA.fader, bytes: encodeU14(Math.max(0, Math.min(2047, f))) });
      return out;
    }
    if (m[1] === 'TLY') {
      const bytes = args.map((s) => int(s) ?? 0).map((v) => (v >= 0 && v <= 2 ? v : 0));
      return [{ addr: VA.tally, bytes }];
    }
    if (m[1] === 'QAL') {
      // 応答は問い合わせた a を含まない → 直前の QAL:a; で判断。QAL:13（ALL）は 13 値
      const vals = args.map(int);
      const q = /^QAL:(\d+);$/.exec(lastQuery ?? '');
      const a = q ? Number(q[1]) : null;
      if (vals.length >= 13) {
        const out: { addr: Addr; bytes: number[] }[] = [];
        for (let x = 0; x <= 10; x += 1) {
          const v = vals[x];
          if (v != null) out.push({ addr: VA.audioLevel(x), bytes: tenthsToLevel(v) });
        }
        const master = vals[12];
        if (master != null) out.push({ addr: VA.masterLevel, bytes: tenthsToLevel(master) });
        return out;
      }
      const v = vals[0];
      if (a == null || v == null) return [];
      if (a >= 0 && a <= 10) return [{ addr: VA.audioLevel(a), bytes: tenthsToLevel(v) }];
      if (a === 12) return [{ addr: VA.masterLevel, bytes: tenthsToLevel(v) }];
      return [];
    }
    return [];
  },
};

// ---- V-600UHD --------------------------------------------------------------

export const v600uhdMap: TextCommandMap = {
  stx: false,
  encodeWrite(addr, bytes) {
    const v = bytes[0] ?? 0;
    const echo = { addr, bytes };
    if (addr === VA.pgm) return { command: `PGM:${v};`, echo };
    if (addr === VA.pst) return { command: `PST:${v};`, echo };
    if (addr === VA.aux) return { command: `AUX:${v};`, echo };
    if (addr === VA.transType) return { command: `TRS:${v};`, echo };
    if (addr === VA.transTime) return { command: `TIM:${v};`, echo };
    if (addr === VA.cut) return v === 1 ? { command: 'CUT;', echo: null } : { command: null, echo: null };
    if (addr === VA.auto) return v === 1 ? { command: 'ATO;', echo: null } : { command: null, echo: null };
    if (addr === VA.outputFade) return { command: `FDE:${v};`, echo };
    if (addr === VA.memLoad) return { command: `MEM:${v};`, echo: null };
    for (let x = 0; x <= 7; x += 1) {
      if (level3At(addr, VA.audioLevel(x))) return { command: `IAL:${x},${levelToTenths(bytes)};`, echo };
    }
    if (addr === VA.masterLevel) return { command: `OAL:${levelToTenths(bytes)};`, echo };
    return { command: null, echo: null };
  },
  encodeRead() {
    return null; // VER 以外の読出しコマンドが無い
  },
  decode() {
    return [];
  },
};

// ---- VR-50HD MK II ---------------------------------------------------------

export const vr50hdmk2Map: TextCommandMap = {
  stx: true,
  encodeWrite(addr, bytes) {
    const v = bytes[0] ?? 0;
    const echo = { addr, bytes };
    if (addr === VA.pgm) return { command: `PGM:${v};`, echo };
    if (addr === VA.aux) return { command: `AUX:${v};`, echo };
    if (addr === VA.transType) return { command: `TRS:${v};`, echo };
    if (addr === VA.transTime) return { command: `TIM:${v};`, echo };
    if (addr === VA.outputFade) return { command: `FDE:${v};`, echo };
    if (addr === VA.memLoad) return { command: `MEM:${v};`, echo: null };
    // 入力 0–3 = LM1–LM4（ch 1–4）、4–7 = LS1–LS4（ch 5/6, 7/8, 9/10, 11/12）。値 0–127（1 バイト）
    for (let x = 0; x <= 7; x += 1) {
      if (addr === VA.audioLevel(x)) return { command: `${x <= 3 ? 'LM' : 'LS'}${(x % 4) + 1}:${v};`, echo };
    }
    if (addr === VA.masterLevel) return { command: `LMN:${v};`, echo };
    return { command: null, echo: null };
  },
  encodeRead(addr) {
    if (addr === VA.pgm) return 'QPG;';
    return null;
  },
  decode(line) {
    const m = /^QPG:(\d+);?$/.exec(line);
    if (m) return [{ addr: VA.pgm, bytes: [Number(m[1]) & 0x7f] }];
    return [];
  },
};

export function textMapFor(model: ModelId): TextCommandMap | null {
  switch (model) {
    case 'V-60HD':
      return v60hdMap;
    case 'V-600UHD':
      return v600uhdMap;
    case 'VR-50HD-MK2':
      return vr50hdmk2Map;
    default:
      return null;
  }
}
