import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { font, mau } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: mau.teal, tabBarInactiveTintColor: mau.muted,
      tabBarLabelStyle: { fontFamily: font.dam, fontSize: 11 }, tabBarStyle: { backgroundColor: mau.be, borderTopColor: mau.line, height: 62, paddingTop: 4 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Gọi món', tabBarIcon: ({ color, size }) => <Ionicons name="cafe-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="order" options={{ title: 'Order', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="lich" options={{ title: 'Lịch làm việc', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="toi" options={{ title: 'Cá nhân', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
