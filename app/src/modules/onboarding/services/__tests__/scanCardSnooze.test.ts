import { isScanCardSnoozed } from '../scanCardSnooze';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-13T12:00:00Z');

describe('o "Agora não" do cartão do escaneamento', () => {
  /**
   * Regressão: a dispensa só valia se o dono do onboarding no aparelho fosse o
   * usuário. Quem reinstala o app depois do onboarding tem esse dono vazio, e o
   * cartão não sumia ao tocar em "Agora não".
   */
  it('esconde o cartão de quem dispensou, sem depender do onboarding no aparelho', () => {
    expect(isScanCardSnoozed({ ownerId: 'aluno-1', at: NOW }, 'aluno-1', NOW)).toBe(true);
  });

  it('volta depois de 30 dias: lembrar não é cobrar', () => {
    expect(isScanCardSnoozed({ ownerId: 'aluno-1', at: NOW - 31 * DAY }, 'aluno-1', NOW)).toBe(
      false
    );
  });

  it('a dispensa de outra conta no mesmo aparelho não vale para esta', () => {
    expect(isScanCardSnoozed({ ownerId: 'aluno-2', at: NOW }, 'aluno-1', NOW)).toBe(false);
  });

  it('sem dispensa, o cartão aparece', () => {
    expect(isScanCardSnoozed(null, 'aluno-1', NOW)).toBe(false);
  });
});
