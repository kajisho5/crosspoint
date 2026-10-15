import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { addrOffset, type Addr } from '@/core/codec/value';

/**
 * 本体パラメータのミラー（DESIGN §5 paramStore）。
 * 1 アドレス = 1 バイト。複数バイトの受信は addr+i（7bit 桁上がり）に展開して格納する（SPEC §8-3）。
 */
export interface PendingWrite {
  bytes: number[];
  ts: number;
}

interface ParamState {
  values: Record<Addr, number>;
  pending: Record<Addr, PendingWrite>;
  /** 受信値の反映 */
  apply: (a: Addr, bytes: readonly number[]) => void;
  /** 一括反映（接続直後の同期） */
  applyMap: (m: ReadonlyMap<Addr, number>) => void;
  /** 楽観更新（書込み時に即 UI へ反映し pending に記録） */
  optimistic: (a: Addr, bytes: readonly number[]) => void;
  clear: () => void;
}

export const useParamStore = create<ParamState>((set) => ({
  values: {},
  pending: {},
  apply: (a, bytes) =>
    set((s) => {
      const values = { ...s.values };
      const pending = { ...s.pending };
      bytes.forEach((b, i) => {
        values[addrOffset(a, i)] = b;
      });
      delete pending[a];
      return { values, pending };
    }),
  applyMap: (m) =>
    set((s) => {
      const values = { ...s.values };
      for (const [a, b] of m) values[a] = b;
      return { values };
    }),
  optimistic: (a, bytes) =>
    set((s) => {
      const values = { ...s.values };
      bytes.forEach((b, i) => {
        values[addrOffset(a, i)] = b;
      });
      return { values, pending: { ...s.pending, [a]: { bytes: [...bytes], ts: Date.now() } } };
    }),
  clear: () => set({ values: {}, pending: {} }),
}));

/** a から size バイトを読む（未受信は undefined） */
export function readBytes(values: Record<Addr, number>, a: Addr, size: number): (number | undefined)[] {
  return Array.from({ length: size }, (_, i) => values[addrOffset(a, i)]);
}

/** 1 アドレスの購読 */
export function useByte(a: Addr | null): number | undefined {
  return useParamStore((s) => (a == null ? undefined : s.values[a]));
}

/** 連続 size バイトの購読（全バイト受信済みなら配列、未受信があれば null） */
export function useBytes(a: Addr | null, size: number): number[] | null {
  const arr = useParamStore(useShallow((s) => (a == null ? [] : readBytes(s.values, a, size))));
  if (a == null || arr.some((v) => v === undefined)) return null;
  return arr as number[];
}
