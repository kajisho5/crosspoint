import type { Addr } from '../codec/value';
import type { ModelId } from '../profiles/types';
import { encodeEnum, encodeInt, getCatalog, paramAddr } from './index';
import type { EnumParam, IntParam, ParamDef, ParamGroup, ParamInstance } from './types';

/**
 * クイック操作（F14）：カタログ（Remote Control Guide）から組み立てる「1 タップで複数パラメータを書く」定義。
 * 機種差はカタログの有無で吸収する（該当パラメータが無い機種では null → ボタンを置かない。SPEC §9-5）。
 *
 *  - embeddedAudioPreset：HDMI IN / SDI IN の全系統を DIGITAL GAIN −16.8 dB ＋ MONO = LR MIX にする
 *  - sdiLevelAPreset：SDI OUT の全系統を 3G-SDI MAPPING = LEVEL-A にする
 *  - hdmiOut3Assign：HDMI OUT 3 の出力割当（PROGRAM / PREVIEW / MULTI-VIEW）を切り替える
 */

export interface QuickWrite {
  addr: Addr;
  bytes: number[];
  /** 送受信ログ・確認ダイアログ用の説明（例 "HDMI IN 1 DIGITAL GAIN → −16.8 dB"） */
  label: string;
}

export interface QuickPreset {
  id: string;
  title: string;
  detail: string;
  writes: QuickWrite[];
}

export const EMBEDDED_DIGITAL_GAIN_DB = -16.8;

const norm = (s: string) => s.toUpperCase().replace(/[\s_()*-]/g, '');

function findGroupByTitle(model: ModelId, re: RegExp): ParamGroup | undefined {
  return getCatalog(model).groups.find((g) => re.test(g.title.toUpperCase()));
}

function findParam(g: ParamGroup | undefined, re: RegExp): ParamDef | undefined {
  return g?.params.find((p) => re.test(p.name.toUpperCase()));
}

function enumIndexOf(p: EnumParam, want: string): number {
  const w = norm(want);
  return p.labels.findIndex((l) => norm(l) === w);
}

/** HDMI IN / SDI IN 全系統：DIGITAL GAIN −16.8 dB ＋ MONO LR MIX */
export function embeddedAudioPreset(model: ModelId): QuickPreset | null {
  const g = findGroupByTitle(model, /^AUDIO INPUT$/);
  const gain = findParam(g, /^DIGITAL GAIN$/);
  const mono = findParam(g, /^MONO/);
  if (!g || !g.instances || !gain || gain.kind !== 'int' || !mono || mono.kind !== 'enum') return null;
  const lrMix = enumIndexOf(mono, 'LR MIX');
  if (lrMix < 0) return null;
  const targets = g.instances.filter((i) => /^(HDMI|SDI) IN \d+$/i.test(i.label));
  if (targets.length === 0) return null;
  const writes: QuickWrite[] = [];
  for (const inst of targets) {
    writes.push({ addr: paramAddr(gain, inst), bytes: encodeInt(gain as IntParam, EMBEDDED_DIGITAL_GAIN_DB), label: `${inst.label} DIGITAL GAIN → ${EMBEDDED_DIGITAL_GAIN_DB.toFixed(1)} dB` });
    writes.push({ addr: paramAddr(mono, inst), bytes: encodeEnum(mono as EnumParam, lrMix), label: `${inst.label} MONO → LR MIX` });
  }
  return {
    id: 'embedded-audio',
    title: 'HDMI/SDI 入力音声を −16.8 dB・LR MIX に',
    detail: `${targets[0]?.label ?? ''}〜${targets[targets.length - 1]?.label ?? ''}（${targets.length} 系統）の DIGITAL GAIN を ${EMBEDDED_DIGITAL_GAIN_DB.toFixed(1)} dB、MONO を LR MIX にします。`,
    writes,
  };
}

/** SDI OUT 全系統：3G-SDI MAPPING = LEVEL-A */
export function sdiLevelAPreset(model: ModelId): QuickPreset | null {
  const g = findGroupByTitle(model, /^VIDEO OUTPUT \(SDI\)$/);
  const map = findParam(g, /^3G-SDI MAPPING$/);
  if (!g || !g.instances || !map || map.kind !== 'enum') return null;
  const levelA = enumIndexOf(map, 'LEVEL-A');
  if (levelA < 0) return null;
  const writes = g.instances.map((inst) => ({ addr: paramAddr(map, inst), bytes: encodeEnum(map, levelA), label: `${inst.label} 3G-SDI MAPPING → LEVEL-A` }));
  return {
    id: 'sdi-level-a',
    title: 'SDI OUT をすべて LEVEL-A に',
    detail: `${g.instances.map((i) => i.label).join('・')} の 3G-SDI MAPPING を LEVEL-A にします。`,
    writes,
  };
}

/** HDMI OUT 3 の出力割当（VIDEO ASSIGN）。choices は PROGRAM / PREVIEW / MULTI-VIEW の順で、その機種に無い選択肢は除く */
export interface OutputAssign {
  param: EnumParam;
  addr: Addr;
  choices: { label: string; index: number }[];
}

export const HDMI_OUT3_CHOICES = ['PROGRAM', 'PREVIEW', 'MULTI-VIEW'] as const;

export function hdmiOut3Assign(model: ModelId): OutputAssign | null {
  const g = findGroupByTitle(model, /^VIDEO ASSIGN$/);
  const p = findParam(g, /^HDMI OUT(PUT)? 3 ASSIGN$/);
  if (!p || p.kind !== 'enum') return null;
  const choices = HDMI_OUT3_CHOICES.map((label) => ({ label, index: enumIndexOf(p, label) })).filter((c) => c.index >= 0);
  if (choices.length === 0) return null;
  return { param: p, addr: paramAddr(p, null as ParamInstance | null), choices };
}

/**
 * テストパターン：HDMI 入力の TEST PATTERN（VIDEO INPUT 系グループ。V-160HD は HDMI IN 5–8 のスケーラー入力のみ、
 * V-80HD / VR-120HD / VR-6HD / V-8HD は全 HDMI 入力）。対応する HDMI 入力のうち番号が最大のもの
 * （V-160HD なら HDMI IN 8）に入れる。そこを INPUT に割り当てておけば 1 タップで PGM/PST に出せる。
 */
export interface TestPatternTarget {
  param: EnumParam;
  instance: ParamInstance;
  addr: Addr;
  /** 列挙 index 順（0 = OFF） */
  choices: { label: string; index: number }[];
}

export function testPatternTarget(model: ModelId): TestPatternTarget | null {
  let best: { param: EnumParam; instance: ParamInstance; n: number } | null = null;
  for (const g of getCatalog(model).groups) {
    if (g.area !== 'video' || !g.instances) continue;
    const p = findParam(g, /^TEST PATTERN$/);
    if (!p || p.kind !== 'enum') continue;
    for (const inst of g.instances) {
      // V-8HD は HDMI 入力を "INPUT n" と呼ぶ（VIDEO INPUT / VIDEO INPUT (SCALER)）
      const m = /^(?:HDMI IN|VIDEO IN|INPUT) (\d+)$/i.exec(inst.label);
      if (!m) continue;
      const n = Number(m[1]);
      if (!best || n > best.n) best = { param: p, instance: inst, n };
    }
  }
  if (!best) return null;
  const choices = best.param.labels.map((label, i) => ({ label, index: i }));
  return { param: best.param, instance: best.instance, addr: paramAddr(best.param, best.instance), choices };
}

/** AUX バス（VIDEO ASSIGN の AUX SOURCE / Aux n Source）と、そのバスを出している出力割当 */
export interface AuxBus {
  /** 表示名（"AUX" / "AUX 1" …） */
  name: string;
  param: EnumParam;
  addr: Addr;
  /** 出力割当のうち、この AUX を選べるもの（auxIndex = その AUX の列挙 index） */
  outputs: { name: string; param: EnumParam; addr: Addr; auxIndex: number }[];
}

export function auxBuses(model: ModelId): AuxBus[] {
  const g = findGroupByTitle(model, /^VIDEO ASSIGN$/);
  if (!g) return [];
  const outputs = g.params.filter((p): p is EnumParam => p.kind === 'enum' && /ASSIGN$/i.test(p.name) && !/^INPUT \d+ ASSIGN$/i.test(p.name));
  const buses: AuxBus[] = [];
  for (const p of g.params) {
    const m = /^AUX\s*(\d*)\s*SOURCE$/i.exec(p.name);
    if (!m || p.kind !== 'enum') continue;
    const n = m[1] ?? '';
    const name = n ? `AUX ${n}` : 'AUX';
    const outs = outputs
      .map((o) => ({ name: o.name.replace(/\s*ASSIGN$/i, '').toUpperCase(), param: o, addr: paramAddr(o, null), auxIndex: enumIndexOf(o, name) }))
      .filter((o) => o.auxIndex >= 0);
    buses.push({ name, param: p, addr: paramAddr(p, null), outputs: outs });
  }
  return buses;
}

/** 列挙ラベルを HDMI / SDI / STILL / その他に分ける（カタログの並び順は保つ） */
export function groupAuxLabels(labels: readonly string[]): { title: string; items: { index: number; label: string }[] }[] {
  const order = ['HDMI', 'SDI', 'STILL', 'INPUT', 'その他'];
  const map = new Map<string, { index: number; label: string }[]>();
  labels.forEach((label, index) => {
    const u = label.toUpperCase();
    const key = u.startsWith('HDMI') ? 'HDMI' : u.startsWith('SDI') ? 'SDI' : u.startsWith('STILL') ? 'STILL' : /^INPUT \d+$/.test(u) ? 'INPUT' : 'その他';
    const arr = map.get(key) ?? [];
    arr.push({ index, label });
    map.set(key, arr);
  });
  return order.filter((k) => map.has(k)).map((k) => ({ title: k, items: map.get(k) ?? [] }));
}
