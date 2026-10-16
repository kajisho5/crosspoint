import { SIMPLE_MACRO_MODELS, supportsSimpleCommands } from '@/core/codec/simpleCommands';
import type { DeviceProfile } from '@/core/profiles/types';
import type { TransportKind } from '@/core/transport/Transport';
import { useConnectionStore } from '@/stores/connection';

/**
 * 機能の提供経路（SPEC §9-5）：
 *  - 'sysex'：プロファイルのアドレスで操作（USB/BLE/LAN 共通）
 *  - 'text' ：LAN/RS-232 簡易制御コマンド（LAN・デモのみ。本体 FW が対応版以上）
 *  - null   ：この機種・この接続では出さない
 */
export type Feature = 'cutAuto' | 'macro' | 'sequencer';
export type FeatureRoute = 'sysex' | 'text' | null;

export function featureRoute(feature: Feature, profile: DeviceProfile, transport: TransportKind | null, version: string | null): FeatureRoute {
  const text = (transport === 'lan' || transport === 'mock') && supportsSimpleCommands(profile.model, version);
  switch (feature) {
    case 'cutAuto':
      if (profile.capabilities.cutAuto) return 'sysex';
      return text ? 'text' : null;
    case 'macro':
      if (text && SIMPLE_MACRO_MODELS.has(profile.model)) return 'text';
      return profile.capabilities.macro && profile.addrs.macroTrigger != null ? 'sysex' : null;
    case 'sequencer':
      if (text && SIMPLE_MACRO_MODELS.has(profile.model)) return 'text';
      return profile.capabilities.sequencer && profile.addrs.sequencer != null ? 'sysex' : null;
    default:
      return null;
  }
}

export function useFeature(feature: Feature, profile: DeviceProfile): FeatureRoute {
  const transport = useConnectionStore((s) => s.transport);
  const version = useConnectionStore((s) => s.version);
  return featureRoute(feature, profile, transport, version);
}
