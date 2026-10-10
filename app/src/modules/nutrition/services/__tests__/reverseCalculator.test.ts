import type { FoodItem } from '../../types';
import { matchFood, sortByMatch } from '../reverseCalculator';

/**
 * Caracterização da calculadora reversa da troca de alimento.
 *
 * Fixa o que a busca de alimento antiga fazia antes de a lógica sair da tela
 * (#353): a quantidade que entrega os alvos e a nota de quão bem um alimento
 * acerta vários alvos de uma vez.
 */

function alimento(parcial: Partial<FoodItem>): FoodItem {
  return {
    id: 'a',
    name: 'Alimento',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving_size: 100,
    serving_unit: 'g',
    ...parcial,
  };
}

describe('matchFood', () => {
  it('não sugere nada sem macro ativo', () => {
    expect(matchFood(alimento({ protein: 20 }), { protein: '30' }, [])).toBeNull();
  });

  it('não sugere nada quando os alvos ativos estão vazios ou zerados', () => {
    expect(matchFood(alimento({ protein: 20 }), { protein: '0' }, ['protein', 'carbs'])).toBeNull();
  });

  it('acerta um alvo só com nota máxima', () => {
    const match = matchFood(alimento({ protein: 20 }), { protein: '30' }, ['protein']);

    expect(match).toEqual({ quantity: 150, score: 100, isMatch: true });
  });

  it('usa a porção do alimento, e não 100, quando ela existe', () => {
    const match = matchFood(alimento({ protein: 10, serving_size: 50 }), { protein: '30' }, [
      'protein',
    ]);

    expect(match?.quantity).toBe(150);
  });

  it('com vários alvos, sugere a média e baixa a nota pela dispersão', () => {
    // 300g pela proteína e 200g pelo carboidrato: média 250, variância 2500.
    const match = matchFood(alimento({ protein: 10, carbs: 25 }), { protein: '30', carbs: '50' }, [
      'protein',
      'carbs',
    ]);

    expect(match?.quantity).toBe(250);
    expect(match?.score).toBeCloseTo(100 / 3.5, 6);
  });

  it('descarta o alimento que não tem o macro pedido', () => {
    const match = matchFood(alimento({ protein: 20, fat: 0 }), { protein: '30', fat: '10' }, [
      'protein',
      'fat',
    ]);

    expect(match).toEqual({ quantity: 0, score: 0, isMatch: false });
  });
});

describe('sortByMatch', () => {
  const exato = alimento({ id: 'exato', protein: 10, carbs: 10 });
  const disperso = alimento({ id: 'disperso', protein: 10, carbs: 25 });
  const semCarbo = alimento({ id: 'semCarbo', protein: 30 });

  it('mantém a ordem da busca sem macro ativo', () => {
    expect(sortByMatch([semCarbo, disperso, exato], {}, [])).toEqual([semCarbo, disperso, exato]);
  });

  it('põe o melhor acerto primeiro e o que não acerta por último', () => {
    const ordem = sortByMatch([semCarbo, disperso, exato], { protein: '30', carbs: '30' }, [
      'protein',
      'carbs',
    ]).map((food) => food.id);

    expect(ordem).toEqual(['exato', 'disperso', 'semCarbo']);
  });
});
