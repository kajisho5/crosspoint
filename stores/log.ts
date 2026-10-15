import { create } from 'zustand';
import type { LogEntry } from '@/core/transport/Transport';

/** 送受信ログ（リングバッファ 500 件、メモリのみ。DESIGN §5） */
export const LOG_CAPACITY = 500;

export interface LogLine extends LogEntry {
  id: number;
}

interface LogState {
  lines: LogLine[];
  nextId: number;
  paused: boolean;
  push: (e: LogEntry) => void;
  clear: () => void;
  setPaused: (p: boolean) => void;
}

export const useLogStore = create<LogState>((set) => ({
  lines: [],
  nextId: 1,
  paused: false,
  push: (e) =>
    set((s) => {
      if (s.paused) return s;
      const line: LogLine = { ...e, id: s.nextId };
      const lines = s.lines.length >= LOG_CAPACITY ? [...s.lines.slice(s.lines.length - LOG_CAPACITY + 1), line] : [...s.lines, line];
      return { lines, nextId: s.nextId + 1 };
    }),
  clear: () => set({ lines: [] }),
  setPaused: (paused) => set({ paused }),
}));
