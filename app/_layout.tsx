import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  Fraunces_400Regular,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { useAppStore } from '../src/stores/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const [isReady, setIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit: Outfit_400Regular,
    OutfitMedium: Outfit_500Medium,
    OutfitSemiBold: Outfit_600SemiBold,
    OutfitBold: Outfit_700Bold,
    Fraunces: Fraunces_400Regular,
    FrauncesDisplay: Fraunces_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      setIsReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hasHydrated]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="trip" />
    </Stack>
  );
}
