import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SW CROSSPOINT',
  slug: 'sw-crosspoint',
  scheme: 'crosspoint',
  version: '0.1.0',
  // アプリアイコン（HIG「App icons」準拠：1024×1024・角丸なし・不透明。dark は透過背景、tinted はグレースケール透過。元 SVG は assets/icon/）
  icon: './assets/icon/icon-light.png',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.seventhwell.crospoint',
    icon: {
      light: './assets/icon/icon-light.png',
      dark: './assets/icon/icon-dark.png',
      tinted: './assets/icon/icon-tinted.png',
    },
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
