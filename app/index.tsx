import { Redirect } from 'expo-router';

/** 起動時はスイッチャー */
export default function Index() {
  return <Redirect href="/switcher" />;
}
