import { ROUTES } from '@/navigation/types';
import { routeAfterSignUp } from '..';

describe('para onde o cadastro leva', () => {
  const original = process.env.EXPO_PUBLIC_ONBOARDING_ENABLED;
  afterEach(() => {
    process.env.EXPO_PUBLIC_ONBOARDING_ENABLED = original;
  });

  it('o Praticante vai direto ao onboarding, sem passar pela tela inicial', () => {
    process.env.EXPO_PUBLIC_ONBOARDING_ENABLED = 'true';
    expect(routeAfterSignUp('member')).toBe(ROUTES.ONBOARDING.WELCOME);
  });

  it('aluno e especialista seguem para a tela inicial', () => {
    process.env.EXPO_PUBLIC_ONBOARDING_ENABLED = 'true';
    expect(routeAfterSignUp('student')).toBe(ROUTES.TABS.ROOT);
    expect(routeAfterSignUp('specialist')).toBe(ROUTES.TABS.ROOT);
  });

  it('com o onboarding desligado, ninguém é desviado', () => {
    process.env.EXPO_PUBLIC_ONBOARDING_ENABLED = 'false';
    expect(routeAfterSignUp('member')).toBe(ROUTES.TABS.ROOT);
  });
});
