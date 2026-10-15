import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { addrOffset, type Addr } from '@/core/codec/value';

/**
 * 本体パラメータのミラー（DESIGN §5 paramStore）。
 * 1 アドレス = 1 バイト。複数バイトの受信は addr+i（7bit 桁上がり）に展開して格納する（SPEC §8-3）。
 * - values    : 画面が見る値（楽観更新を含む）
 * - confirmed : 本体から受信した最新値（ロールバック先）
 * - pending   : 楽観更新中の書込み（SPEC §10-2：1.5s 以内に一致値が来なければ confirmed に戻す）
 */
export interface PendingWrite {
  bytes: number[];
  ts: number;
}

interface ParamState {
  values: Record<Addr, number>;
  confirmed: Record<Addr, number>;
  pending: Record<Addr, PendingWrite>;
  /** 受信値の反映 */
  apply: (a: Addr, bytes: readonly number[]) => void;
  /** 一括反映（接続直後の同期） */
  applyMap: (m: ReadonlyMap<Addr, number>) => void;
  /** 楽観更新（書込み時に即 UI へ反映し pending に記録） */
  optimistic: (a: Addr, bytes: readonly number[]) => void;
  /** 楽観更新の取消し：confirmed の値へ戻す */
  rollback: (a: Addr) => void;
  clear: () => void;
}

export const useParamStore = create<ParamState>((set) => ({
  values: {},
  confirmed: {},
  pending: {},
  apply: (a, bytes) =>
    set((s) => {
      const values = { ...s.values };
      const confirmed = { ...s.confirmed };
      const pending = { ...s.pending };
      bytes.forEach((b, i) => {
        const at = addrOffset(a, i);
        values[at] = b;
        confirmed[at] = b;
      });
      // 受信範囲に先頭が含まれる pending は確定扱い（本体の値が正。自発通知は 1 バイト単発で来ることが多い）
      const end = addrOffset(a, bytes.length - 1);
      for (const key of Object.keys(pending)) {
        const pa = Number(key);
        if (pa >= a && pa <= end) delete pending[pa];
      }
      return { values, confirmed, pending };
    }),
  applyMap: (m) =>
    set((s) => {
      const values = { ...s.values };
      const confirmed = { ...s.confirmed };
      for (const [a, b] of m) {
        values[a] = b;
        confirmed[a] = b;
      }
      return { values, confirmed };
    }),
  optimistic: (a, bytes) =>
    set((s) => {
      const values = { ...s.values };
      bytes.forEach((b, i) => {
        values[addrOffset(a, i)] = b;
      });
      return { values, pending: { ...s.pending, [a]: { bytes: [...bytes], ts: Date.now() } } };
    }),
  rollback: (a) =>
    set((s) => {
      const p = s.pending[a];
      if (!p) return s;
      const values = { ...s.values };
      const pending = { ...s.pending };
      p.bytes.forEach((_b, i) => {
        const at = addrOffset(a, i);
        if (s.confirmed[at] === undefined) delete values[at];
        else values[at] = s.confirmed[at];
      });
      delete pending[a];
      return { values, pending };
    }),
  clear: () => set({ values: {}, confirmed: {}, pending: {} }),
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
