import { Stack } from 'expo-router';
import { useCores } from '@/shared/design';

export default function AuthLayout() {
  const cores = useCores();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="mfa" />
    </Stack>
  );
}
