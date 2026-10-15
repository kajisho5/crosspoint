import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useLayoutProfile } from '@/stores/selectors';

/** タブはシステムの UITabBar（Native Tabs）。自前で描かない（SPEC §11） */
export default function TabsLayout() {
  const profile = useLayoutProfile();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="switcher">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.3x2', selected: 'square.grid.3x2.fill' }} />
        <NativeTabs.Trigger.Label>スイッチャー</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="keys">
        <NativeTabs.Trigger.Icon sf={{ default: 'pip', selected: 'pip.fill' }} />
        <NativeTabs.Trigger.Label>キー</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="audio">
        <NativeTabs.Trigger.Icon sf="slider.vertical.3" />
        <NativeTabs.Trigger.Label>オーディオ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="memory">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <NativeTabs.Trigger.Label>{profile.memoryNoun}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf="ellipsis" />
        <NativeTabs.Trigger.Label>その他</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
