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

const norm = (s: string) => s.toUpperCase().replace(/[\s_()*0-9]/g, '').replace(/-/g, '');

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
