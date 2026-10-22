import { Stack } from 'expo-router';

export function StudentsNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="invite" />
      {/* A mesma folha da aba Treinos, aqui para o Voltar ficar nos Alunos (#437). */}
      <Stack.Screen
        name="[id]/workouts/new"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.94],
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
    </Stack>
  );
}
