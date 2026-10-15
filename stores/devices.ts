import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ModelId } from '@/core/profiles/types';

/**
 * 保存済み機器（DESIGN §6 SavedDevice）。
 * パスワードは expo-secure-store（Keychain）、それ以外は AsyncStorage。
 */
export type SavedTransport = 'lan' | 'usb' | 'ble';

export interface SavedDevice {
  id: string;
  name: string;
  transport: SavedTransport;
  model?: ModelId;
  host?: string;
  port?: number;
  midiEndpointName?: string;
  /** CoreMIDI の UniqueID（Destination / Source）。次回はまず UniqueID、無ければ名前の部分一致で再選択（SPEC §5-2） */
  midiUniqueId?: number;
  midiSrcUniqueId?: number;
  /** パスワードが SecureStore に保存されているか */
  hasPassword: boolean;
}

interface DevicesState {
  saved: SavedDevice[];
  lastUsedId: string | null;
  upsert: (d: SavedDevice) => void;
  remove: (id: string) => void;
  setLastUsed: (id: string | null) => void;
}

export const useDevicesStore = create<DevicesState>()(
  persist(
    (set) => ({
      saved: [],
      lastUsedId: null,
      upsert: (d) =>
        set((s) => {
          const i = s.saved.findIndex((x) => x.id === d.id);
          if (i < 0) return { saved: [...s.saved, d] };
          const saved = [...s.saved];
          saved[i] = d;
          return { saved };
        }),
      remove: (id) =>
        set((s) => ({
          saved: s.saved.filter((x) => x.id !== id),
          lastUsedId: s.lastUsedId === id ? null : s.lastUsedId,
        })),
      setLastUsed: (lastUsedId) => set({ lastUsedId }),
    }),
    {
      name: 'crosspoint.devices',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ saved, lastUsedId }) => ({ saved, lastUsedId }),
    },
  ),
);

const pwKey = (id: string) => `crosspoint.pw.${id}`;

export async function savePassword(id: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(pwKey(id), password, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function loadPassword(id: string): Promise<string | null> {
  return SecureStore.getItemAsync(pwKey(id));
}

export async function deletePassword(id: string): Promise<void> {
  await SecureStore.deleteItemAsync(pwKey(id));
}

export function newDeviceId(): string {
  return `dev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
