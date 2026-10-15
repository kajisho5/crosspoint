import { v160hd } from './v160hd';
import { v80hd } from './v80hd';
import { vr120hd } from './vr120hd';
import type { DeviceProfile, ModelId } from './types';

export const PROFILES: Record<ModelId, DeviceProfile> = {
  'V-160HD': v160hd,
  'V-80HD': v80hd,
  'VR-120HD': vr120hd,
};

export function getProfile(model: ModelId): DeviceProfile {
  return PROFILES[model];
}

/** VER 応答の機種名からプロファイルを引く（対応外は null → WRONG_DEVICE） */
export function profileFromVerName(name: string): DeviceProfile | null {
  return Object.values(PROFILES).find((p) => p.verName === name) ?? null;
}

export function sourceName(profile: DeviceProfile, code: number): string {
  return profile.sources.find((s) => s.code === code)?.name ?? `SRC ${code}`;
}

export type { DeviceProfile, ModelId } from './types';
