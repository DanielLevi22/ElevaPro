import { Stack } from 'expo-router';
import { useRememberOnboardingStep } from '@/modules/onboarding';

export default function OnboardingLayout() {
  // Fechar o app no meio retoma desta tela (#365).
  useRememberOnboardingStep();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}
