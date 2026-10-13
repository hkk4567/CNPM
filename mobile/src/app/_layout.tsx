import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { PhienProvider, usePhien } from '../context/Phien';
import { mau } from '../theme';

function DieuHuong() {
  const { dangNap, nguoiDung } = usePhien();
  if (dangNap) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: mau.nen }}><ActivityIndicator size="large" color={mau.teal} /></View>;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: mau.nen } }}>
      <Stack.Protected guard={!!nguoiDung}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="doi-mat-khau" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!nguoiDung}>
        <Stack.Screen name="dang-nhap" />
      </Stack.Protected>
    </Stack>
  );
}

export default function GocLayout() {
  const [daNap] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold });
  if (!daNap) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PhienProvider><DieuHuong /></PhienProvider>
    </SafeAreaProvider>
  );
}
