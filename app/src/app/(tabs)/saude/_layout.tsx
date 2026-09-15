import { Stack } from 'expo-router';

/** A saúde em vidro (#308): a Saúde do dia e o que se abre a partir dela. */
/** A Saúde do dia é a base da pilha: voltar de Meu relógio chega nela. */
export const unstable_settings = { initialRouteName: 'hoje' };

export default function HealthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
