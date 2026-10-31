import { Stack } from 'expo-router';

export function WorkoutNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="select-exercises" options={{ presentation: 'modal' }} />
      {/* Folha, como pede o #387: o formulário sobe por cima da lista ou da
          periodização e, ao fechar, a pessoa continua onde estava. Segue rota
          porque o cadastro de aluno também abre o formulário. */}
      <Stack.Screen
        name="periodization-form"
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
