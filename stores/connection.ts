import { create } from 'zustand';
import type { ModelId } from '@/core/profiles/types';
import type { LinkError, LinkState, TransportKind } from '@/core/transport/Transport';

/** 接続状態（DESIGN §5 connectionStore） */
interface ConnectionState {
  link: LinkState;
  transport: TransportKind | null;
  deviceName: string | null;
  model: ModelId | null;
  version: string | null;
  rttMs: number | null;
  error: LinkError | null;
  /** F11 デモモード中（MockTransport） */
  demo: boolean;
  setLink: (link: LinkState, error?: LinkError) => void;
  setSession: (s: { transport: TransportKind; deviceName: string; model: ModelId | null; demo: boolean }) => void;
  setDevice: (model: ModelId, version: string) => void;
  setRtt: (ms: number | null) => void;
  reset: () => void;
}

const initial = {
  link: 'idle' as LinkState,
  transport: null,
  deviceName: null,
  model: null,
  version: null,
  rttMs: null,
  error: null,
  demo: false,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initial,
  setLink: (link, error) => set({ link, error: error ?? null }),
  setSession: ({ transport, deviceName, model, demo }) => set({ transport, deviceName, model, demo, version: null, error: null }),
  setDevice: (model, version) => set({ model, version }),
  setRtt: (rttMs) => set({ rttMs }),
  reset: () => set(initial),
}));

export function isOnline(link: LinkState): boolean {
  return link === 'online';
}
