import { v160hd } from './v160hd';
import { v80hd } from './v80hd';
import { vr120hd } from './vr120hd';
import { vr6hd } from './vr6hd';
import { v14k } from './v14k';
import { v8hd } from './v8hd';
import { v1hd } from './v1hd';
import { v1sdi } from './v1sdi';
import { vr4hd } from './vr4hd';
import { v02hdmk2 } from './v02hdmk2';
import type { DeviceProfile, ModelId } from './types';

export const PROFILES: Record<ModelId, DeviceProfile> = {
  'V-160HD': v160hd,
  'V-80HD': v80hd,
  'VR-120HD': vr120hd,
  'VR-6HD': vr6hd,
  'V-1-4K': v14k,
  'V-8HD': v8hd,
  'V-1HD': v1hd,
  'V-1SDI': v1sdi,
  'VR-4HD': vr4hd,
  'V-02HD-MK2': v02hdmk2,
};

/** モック・CLI 用：'v80hd' 'vr-6hd' のような表記から ModelId を引く */
export function modelIdFrom(text: string): ModelId | null {
  const key = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (Object.keys(PROFILES) as ModelId[]).find((m) => m.replace(/[^A-Z0-9]/g, '') === key) ?? null;
}

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
