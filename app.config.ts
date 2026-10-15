import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SW CROSSPOINT',
  slug: 'sw-crosspoint',
  scheme: 'crosspoint',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.seventhwell.crospoint',
    supportsTablet: true,
    infoPlist: {
      NSLocalNetworkUsageDescription: '同じネットワーク上のビデオスイッチャーに接続するために使用します',
      NSBluetoothAlwaysUsageDescription: 'ビデオスイッチャーと Bluetooth MIDI で接続するために使用します',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '17.0' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
