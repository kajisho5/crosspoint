import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { controller } from '@/core/controller/DeviceController';
import type { VisibleTab } from '@/core/controller/SyncEngine';

/** タブがフォーカスされたら SyncEngine のポーリング対象を切り替える（SPEC §10-2） */
export function useVisibleTab(tab: VisibleTab): void {
  useFocusEffect(
    useCallback(() => {
      controller.setVisibleTab(tab);
    }, [tab]),
  );
}
