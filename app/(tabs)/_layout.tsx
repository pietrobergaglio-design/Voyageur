import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="search"  options={{ title: 'Cerca' }} />
      <Tabs.Screen name="trips"   options={{ title: 'Viaggi' }} />
      <Tabs.Screen name="docs"    options={{ title: 'Documenti' }} />
      <Tabs.Screen name="explore" options={{ title: 'Esplora' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo' }} />
    </Tabs>
  );
}
