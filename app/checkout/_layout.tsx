import { Stack } from 'expo-router';

export default function CheckoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="summary" />
      <Stack.Screen name="travelers" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="success" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
