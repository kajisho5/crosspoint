import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** アプリ設定（DESIGN §5 settingsStore／SPEC §11 S5）。AsyncStorage に永続化 */
export type PgmValueMode = 'logical20' | 'guide10';

export const POLL_OPTIONS_MS = [250, 500, 1000, 2000] as const;
export type PollMs = (typeof POLL_OPTIONS_MS)[number];

interface SettingsState {
  haptics: boolean;
  lockEnabled: boolean;
  keepAwake: boolean;
  pollMs: PollMs;
  /** SPEC §9-3：V-160HD の PGM/PST 値方式。既定 logical20 */
  pgmValueMode: PgmValueMode;
  set: <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => void;
}

export type SettingsValues = Omit<SettingsState, 'set'>;

export const DEFAULT_SETTINGS: SettingsValues = {
  haptics: true,
  lockEnabled: false,
  keepAwake: true,
  pollMs: 500,
  pgmValueMode: 'logical20',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: 'crosspoint.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);
