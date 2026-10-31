import { approveSimplerDiet, requestSimplerDiet } from '../simplerDietService';
import { simplerPlanReason, simplerPlanRows } from '../simplerPlanCopy';

const mockPostBff = jest.fn();

jest.mock('@/shared/bff', () => ({
  postBff: (path: string, body: unknown, options: unknown) => mockPostBff(path, body, options),
}));
jest.mock('@/auth', () => ({ tokenDaSessao: () => 'token-do-aluno' }));

const PLAN = { adherenceDays: 2, mealsPerDay: 5, nextMealsPerDay: 4 };

describe('o texto do plano mais simples (A5c)', () => {
  // #376: o tom não cobra; diz o que muda, não o que a pessoa errou.
  it('diz quantos dias a pessoa seguiu e que as calorias não caem', () => {
    expect(simplerPlanReason(PLAN)).toBe(
      'Você seguiu 2 de 7 dias. Em vez de cortar calorias, vamos deixar o plano mais fácil de seguir.'
    );
  });

  it('uma refeição a menos na mesma meta, e receitas de até 15 minutos', () => {
    expect(simplerPlanRows(PLAN)).toEqual([
      { title: 'Refeições por dia', before: '5', after: '4', badge: 'mesma meta' },
      {
        title: 'Tempo das receitas',
        before: 'como hoje',
        after: 'até 15 min',
        badge: 'estimativa',
      },
    ]);
  });
});

describe('simplerDietService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pede o cardápio pelo check-in, com o token da sessão', async () => {
    mockPostBff.mockResolvedValue({ diet: { mealsAfter: 4 } });

    expect(await requestSimplerDiet('c1')).toEqual({ mealsAfter: 4 });
    expect(mockPostBff).toHaveBeenCalledWith(
      '/api/ai/student/diet/simplify',
      { checkInId: 'c1' },
      { token: 'token-do-aluno' }
    );
  });

  // ADR-0020: o servidor grava a cópia que a pessoa viu, não o que o app manda.
  it('aprovar não manda o cardápio', async () => {
    mockPostBff.mockResolvedValue({});
    await approveSimplerDiet();
    expect(mockPostBff).toHaveBeenCalledWith(
      '/api/ai/student/diet/simplify/approve',
      {},
      { token: 'token-do-aluno' }
    );
  });
});
