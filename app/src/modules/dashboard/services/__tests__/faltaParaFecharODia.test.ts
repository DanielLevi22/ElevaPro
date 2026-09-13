import { faltaParaFecharODia } from '../faltaParaFecharODia';

const meta = (parcial: {
  refeicoesFeitas?: number;
  refeicoesMeta?: number;
  treinosFeitos?: number;
  treinosMeta?: number;
}) => ({
  meals_completed: parcial.refeicoesFeitas ?? 0,
  meals_target: parcial.refeicoesMeta ?? 4,
  workout_completed: parcial.treinosFeitos ?? 0,
  workout_target: parcial.treinosMeta ?? 1,
});

describe('o que falta para fechar o dia', () => {
  it('dá a cada sujeito o seu verbo', () => {
    // "faltam 1 treino e 2 refeições" erraria o primeiro; em português cada
    // sujeito leva a própria concordância.
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 2 }))).toBe(
      'Falta 1 treino e faltam 2 refeições para fechar o dia.'
    );
  });

  it('levanta a inicial mesmo quando a frase começa no plural', () => {
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 2, treinosFeitos: 1 }))).toBe(
      'Faltam 2 refeições para fechar o dia.'
    );
  });

  it('fala só do que falta', () => {
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 4 }))).toBe(
      'Falta 1 treino para fechar o dia.'
    );
  });

  it('usa o singular quando falta uma só refeição', () => {
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 3, treinosFeitos: 1 }))).toBe(
      'Falta 1 refeição para fechar o dia.'
    );
  });

  it('comemora quando não falta nada, em vez de mostrar frase vazia', () => {
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 4, treinosFeitos: 1 }))).toBe(
      'Dia fechado. Amanhã tem mais.'
    );
  });

  it('não fala de falta negativa quando a pessoa passa da meta', () => {
    // Quem faz 6 de 4 refeições não tem "-2 refeições" faltando.
    expect(faltaParaFecharODia(meta({ refeicoesFeitas: 6, treinosFeitos: 3 }))).toBe(
      'Dia fechado. Amanhã tem mais.'
    );
  });

  it('fica calada sem meta, em vez de inventar uma', () => {
    // Antes da primeira sincronização do dia a meta não existe. Frase vazia é
    // melhor que "Faltam 0 refeições".
    expect(faltaParaFecharODia(null)).toBe('');
  });

  it('conta a meta que o plano definiu, e não um número fixo', () => {
    expect(faltaParaFecharODia(meta({ refeicoesMeta: 6, treinosFeitos: 1 }))).toBe(
      'Faltam 6 refeições para fechar o dia.'
    );
  });
});
