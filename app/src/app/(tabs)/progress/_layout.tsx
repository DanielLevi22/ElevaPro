import { Stack } from 'expo-router';

/** O hub de Progresso é a base da pilha: voltar da evolução de cargas chega nele (#312). */
export const unstable_settings = { initialRouteName: 'index' };

export default function ProgressLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
