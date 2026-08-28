import { Stack } from 'expo-router';

export function WorkoutNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="select-exercises" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
