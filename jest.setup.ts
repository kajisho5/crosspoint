// jest-expo の既定モックに加え、ネイティブ依存のモジュールを置き換える。
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// AsyncStorage（zustand persist）
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Gesture Handler / Reanimated / Worklets のテスト用モック（ネイティブランタイム無しで描画する）
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => require('./node_modules/react-native-worklets/lib/module/mock.js'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
