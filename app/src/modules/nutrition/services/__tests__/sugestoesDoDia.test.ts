import type { DietMeal } from '@elevapro/shared';
import { faltamNoDia, nomesDasFavoritas, sugestoesGuardadas } from '../sugestoesDoDia';

/**
 * "Sugestões do assistente" da busca: o que vai à rota e quando ela é chamada
 * de novo (issue #298). Ao provedor vão só os macros que faltam e os nomes das
 * favoritas; a resposta fica no aparelho até o dia virar.
 */

const meta = { calorias: 2400, proteina: 180, carboidrato: 250, gordura: 70 };

describe('o que falta no dia', () => {
  it('é a meta menos o consumo, em número inteiro', () => {
    const consumo = { calorias: 1540.4, proteina: 148.6, carboidrato: 162, gordura: 47 };

    expect(faltamNoDia(meta, consumo)).toEqual({
      calorias: 860,
      proteina: 31,
      carboidrato: 88,
      gordura: 23,
    });
  });

  // A rota recusa número negativo: macro estourado é zero que falta.
  it('macro acima da meta falta zero', () => {
    const consumo = { calorias: 2600, proteina: 190, carboidrato: 100, gordura: 70 };

    expect(faltamNoDia(meta, consumo)).toMatchObject({ calorias: 0, proteina: 0, gordura: 0 });
  });
});

describe('nomes das favoritas', () => {
  const refeicoes = [
    { id: 'r1', name: 'Café da manhã' },
    { id: 'r2', name: 'Almoço' },
    { id: 'r3', name: 'Jantar' },
  ] as DietMeal[];

  it('só os nomes das refeições marcadas, na ordem do plano', () => {
    expect(nomesDasFavoritas(refeicoes, ['r3', 'r1'])).toEqual(['Café da manhã', 'Jantar']);
  });

  // Favorita de um plano antigo continua no aparelho, mas não é mais refeição.
  it('id que não é refeição do plano fica de fora', () => {
    expect(nomesDasFavoritas(refeicoes, ['apagada'])).toEqual([]);
  });
});

describe('sugestões guardadas', () => {
  const sugestoes = [
    { nome: 'Salada de frango', calorias: 320, minutos: 20, destaque: 'Alta proteína' },
  ];

  it('valem no mesmo dia', () => {
    expect(sugestoesGuardadas({ dia: '2026-09-13', sugestoes }, '2026-09-13')).toBe(sugestoes);
  });

  it('o dia virou, não valem', () => {
    expect(sugestoesGuardadas({ dia: '2026-09-12', sugestoes }, '2026-09-13')).toBeNull();
  });

  it('sem nada guardado, não há o que valer', () => {
    expect(sugestoesGuardadas(undefined, '2026-09-13')).toBeNull();
  });
});
