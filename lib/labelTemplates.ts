/**
 * ラベル編集（F12）のテンプレート。現場でよく使う 8 文字以内の表示名。
 *  - numbered: タップすると、他のソースで使っていない最小の番号を付ける（CAM 1, CAM 2 … の次）
 *  - fixed: そのまま入れる
 */
export interface LabelTemplate {
  text: string;
  numbered: boolean;
}

export const LABEL_TEMPLATES: readonly LabelTemplate[] = [
  { text: 'CAM', numbered: true },
  { text: 'PTZ', numbered: true },
  { text: 'PC', numbered: true },
  { text: 'GFX', numbered: true },
  { text: 'T2 P1', numbered: false },
  { text: 'T2 P2', numbered: false },
  { text: 'PVP', numbered: false },
  { text: 'MAIN', numbered: false },
  { text: 'BU', numbered: false },
  { text: 'SUB', numbered: false },
  { text: 'TITLE', numbered: false },
  { text: 'LOGO', numbered: false },
  { text: 'WIDE', numbered: false },
  { text: 'DOC', numbered: false },
];

const LABEL_MAX = 8;

/** `BASE n` 形式の n を取り出す（大文字小文字・前後の空白は無視） */
function numberOf(base: string, label: string): number | null {
  const m = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`, 'i').exec(label.trim());
  return m ? Number(m[1]) : null;
}

/** テンプレートを適用したラベル。numbered は既存ラベルと被らない最小番号（1 始まり）を付ける。8 文字に収まらなければ番号なし */
export function applyTemplate(t: LabelTemplate, existingLabels: readonly string[]): string {
  if (!t.numbered) return t.text.slice(0, LABEL_MAX);
  const used = new Set<number>();
  for (const l of existingLabels) {
    const n = numberOf(t.text, l);
    if (n != null) used.add(n);
  }
  let n = 1;
  while (used.has(n)) n += 1;
  const candidate = `${t.text} ${n}`;
  return candidate.length <= LABEL_MAX ? candidate : t.text.slice(0, LABEL_MAX);
}
