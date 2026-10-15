import { requireOptionalNativeModule, type EventSubscription, type NativeModule } from 'expo-modules-core';

/**
 * crosspoint-midi の JS インターフェース（SPEC §7-1）。
 * ネイティブ（Swift）は ios/ 配下。Expo Go・jest・Android ではモジュールが無いので `getCrosspointMidi()` は null を返す。
 */

export type MidiTransportKind = 'usb' | 'ble' | 'network' | 'other';

export interface MidiEndpointInfo {
  /** kMIDIPropertyUniqueID（Destination 側の値） */
  uniqueId: number;
  /** 対になる Source の UniqueID（見つからなければ 0） */
  sourceUniqueId: number;
  /** kMIDIPropertyDisplayName */
  name: string;
  /** 親 Device 名 */
  deviceName: string;
  transport: MidiTransportKind;
  /** kMIDIPropertyOffline の否定 */
  online: boolean;
  /** kMIDIPropertyDriverOwner の生値（§13 の実機確認用） */
  driverOwner: string;
}

export type CrosspointMidiEvents = {
  onSysEx: (ev: { bytes: number[]; ts: number }) => void;
  onEndpointsChanged: (ev: { endpoints: MidiEndpointInfo[] }) => void;
  onLinkLost: (ev: { uniqueId: number }) => void;
  onLog: (ev: { level: 'debug' | 'warn' | 'error'; msg: string }) => void;
};

export interface CrosspointMidi {
  /** Source と Destination を Device 単位でペアにして返す */
  listEndpoints(): Promise<MidiEndpointInfo[]>;
  /** 入力ポート接続、出力先保持 */
  open(destUniqueId: number, srcUniqueId: number): Promise<void>;
  close(): Promise<void>;
  /** F0…F7 を含む完全メッセージ。20ms 間隔はネイティブ側でも保証 */
  sendSysEx(bytes: number[]): Promise<void>;
  /** CABTMIDICentralViewController を表示、閉じたら resolve */
  presentBluetoothPicker(): Promise<void>;
  addListener<K extends keyof CrosspointMidiEvents>(event: K, listener: CrosspointMidiEvents[K]): EventSubscription;
}

type NativeShape = NativeModule<CrosspointMidiEvents> & Omit<CrosspointMidi, 'addListener'>;

let cached: CrosspointMidi | null | undefined;

/** ネイティブモジュールがあれば返す。無ければ null（USB/BLE 非対応環境） */
export function getCrosspointMidi(): CrosspointMidi | null {
  if (cached !== undefined) return cached;
  const native = requireOptionalNativeModule<NativeShape>('CrosspointMidi');
  cached = native ? (native as unknown as CrosspointMidi) : null;
  return cached;
}

/** テスト用：実装を差し替える */
export function setCrosspointMidiForTesting(impl: CrosspointMidi | null | undefined): void {
  cached = impl;
}
