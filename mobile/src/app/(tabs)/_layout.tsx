import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { font, mau } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: mau.teal, tabBarInactiveTintColor: mau.muted,
      tabBarLabelStyle: { fontFamily: font.dam, fontSize: 12 }, tabBarStyle: { backgroundColor: mau.be, borderTopColor: mau.line, height: 62, paddingTop: 4 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Lịch làm việc', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="toi" options={{ title: 'Cá nhân', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
