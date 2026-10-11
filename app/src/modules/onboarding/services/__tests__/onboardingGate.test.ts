import { shouldEnterOnboarding } from '../onboardingGate';

const PRATICANTE_SEM_ANAMNESE = {
  enabled: true,
  accountType: 'member' as const,
  anamnesisCompleted: false,
  inOnboarding: false,
  consentDeclined: false,
};

describe('shouldEnterOnboarding', () => {
  it('leva ao onboarding o Praticante sem anamnese concluída', () => {
    expect(shouldEnterOnboarding(PRATICANTE_SEM_ANAMNESE)).toBe(true);
  });

  it('não leva quem já concluiu a anamnese', () => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, anamnesisCompleted: true })).toBe(
      false
    );
  });

  it('não leva o Aluno com especialista, mesmo sem anamnese', () => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, accountType: 'student' })).toBe(
      false
    );
  });

  it.each(['specialist', 'admin'] as const)('não leva o papel %s', (accountType) => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, accountType })).toBe(false);
  });

  it('não desvia enquanto não se sabe se a anamnese foi concluída', () => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, anamnesisCompleted: null })).toBe(
      false
    );
  });

  it('não desvia quem já está no onboarding', () => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, inOnboarding: true })).toBe(false);
  });

  it('não volta a pedir o onboarding a quem recusou o consentimento de saúde', () => {
    // Sem o aceite a anamnese não pode ser gravada (0083): ela nunca fica
    // concluída, e o guarda prenderia a pessoa no onboarding para sempre.
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, consentDeclined: true })).toBe(
      false
    );
  });

  it('não desvia ninguém com o onboarding desligado no ambiente', () => {
    expect(shouldEnterOnboarding({ ...PRATICANTE_SEM_ANAMNESE, enabled: false })).toBe(false);
  });
});
