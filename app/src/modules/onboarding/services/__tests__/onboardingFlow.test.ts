import { nextOnboardingStep } from '../onboardingFlow';

const R = {
  scope: '/onboarding/scope',
  goal: '/onboarding/goal',
  level: '/onboarding/level',
  consent: '/onboarding/consent',
  about: '/onboarding/about',
  scanOffer: '/onboarding/scan-offer',
  health: '/onboarding/health',
  training: '/onboarding/training',
  food: '/onboarding/food',
  building: '/onboarding/building',
};

describe('nextOnboardingStep — cada escolha pergunta só o que usa', () => {
  it('treino e dieta: o fluxo inteiro', () => {
    const ctx = { scope: 'both' as const, dietAllowed: true };
    expect(nextOnboardingStep('welcome', ctx)).toBe(R.scope);
    expect(nextOnboardingStep('scope', ctx)).toBe(R.goal);
    expect(nextOnboardingStep('goal', ctx)).toBe(R.level);
    expect(nextOnboardingStep('level', ctx)).toBe(R.consent);
    expect(nextOnboardingStep('consent', ctx)).toBe(R.about);
    expect(nextOnboardingStep('about', ctx)).toBe(R.scanOffer);
    expect(nextOnboardingStep('scanOffer', ctx)).toBe(R.health);
    expect(nextOnboardingStep('health', ctx)).toBe(R.training);
    expect(nextOnboardingStep('training', ctx)).toBe(R.food);
    expect(nextOnboardingStep('food', ctx)).toBe(R.building);
  });

  /**
   * TRAVA — necessidade (Art. 6°, III): quem quer só treino não passa pelo
   * escaneamento nem pela alimentação. Passa por O4, só para a idade: o plano
   * automático não atende menor (ADR-0044), e pular O4 deixava o menor passar.
   * Que O4 só pede a idade nesse caminho, trava `validateAboutYou`.
   */
  it('só treino: O4 só para a idade, sem escaneamento e sem alimentação', () => {
    const ctx = { scope: 'training' as const, dietAllowed: null };
    const caminho = [
      'welcome',
      'scope',
      'goal',
      'level',
      'consent',
      'about',
      'health',
      'training',
    ].map((de) => nextOnboardingStep(de as Parameters<typeof nextOnboardingStep>[0], ctx));
    for (const proibida of [R.scanOffer, R.food]) {
      if ((caminho as string[]).includes(proibida)) {
        throw new Error(`DADO DESNECESSÁRIO: "só treino" passou por ${proibida}`);
      }
    }
    if (nextOnboardingStep('consent', ctx) !== R.about) {
      throw new Error('MENOR SEM BARREIRA: "só treino" pulou a única tela que pergunta a idade');
    }
    expect(nextOnboardingStep('about', ctx)).toBe(R.health);
    expect(nextOnboardingStep('training', ctx)).toBe(R.building);
  });

  it('só dieta: pula o nível, que só define o treino', () => {
    const ctx = { scope: 'diet' as const, dietAllowed: true };
    expect(nextOnboardingStep('goal', ctx)).toBe(R.consent);
    expect(nextOnboardingStep('training', ctx)).toBe(R.food);
  });

  it('sem dieta pela triagem, treino e dieta vira só treino depois de O6', () => {
    expect(nextOnboardingStep('training', { scope: 'both', dietAllowed: false })).toBe(R.building);
  });
});
