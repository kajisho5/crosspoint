import { create } from 'zustand';

/** 簡易制御コマンドの応答で分かる状態（SysEx アドレスが無いもの）。null = 未取得 */
interface SimpleState {
  seqOn: boolean | null;
  seqAuto: boolean | null;
  /** 実行中と応答のあったマクロ番号（QMCRST） */
  macroRunning: Record<number, boolean>;
  setSeq: (v: { on?: boolean; auto?: boolean }) => void;
  setMacroRunning: (n: number, on: boolean) => void;
  clear: () => void;
}

export const useSimpleStore = create<SimpleState>((set) => ({
  seqOn: null,
  seqAuto: null,
  macroRunning: {},
  setSeq: (v) => set((s) => ({ seqOn: v.on ?? s.seqOn, seqAuto: v.auto ?? s.seqAuto })),
  setMacroRunning: (n, on) => set((s) => ({ macroRunning: { ...s.macroRunning, [n]: on } })),
  clear: () => set({ seqOn: null, seqAuto: null, macroRunning: {} }),
}));
