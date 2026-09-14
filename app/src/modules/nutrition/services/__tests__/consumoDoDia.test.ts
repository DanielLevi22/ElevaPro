import type { DietMeal, DietMealItem, DietPlan, Food, MealLog } from '@elevapro/shared';
import { consumoDoDia, metaDoDia, percentualDaMeta } from '../consumoDoDia';

/**
 * O anel do plano do dia mostra o que o aluno **comeu**, e não o que estava
 * prescrito: só refeição marcada soma, e o que ele trocou ou acrescentou vale
 * no lugar do plano.
 */

function alimento(over: Partial<Food> = {}): Food {
  return {
    id: 'frango',
    name: 'Peito de frango',
    serving_size: 100,
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 4,
    ...over,
  } as Food;
}

function item(over: Partial<DietMealItem> = {}): DietMealItem {
  return { id: 'item-1', quantity: 200, unit: 'g', food: alimento(), ...over } as DietMealItem;
}

function refeicao(id: string): DietMeal {
  return { id, name: id } as DietMeal;
}

function registro(over: Partial<MealLog> = {}): MealLog {
  return { completed: true, actual_items: null, ...over } as MealLog;
}

describe('consumo do dia', () => {
  it('soma só as refeições marcadas como feitas', () => {
    const consumo = consumoDoDia(
      [refeicao('almoco'), refeicao('jantar')],
      { almoco: registro() },
      { almoco: [item()], jantar: [item()] }
    );

    expect(consumo).toEqual({ calorias: 330, proteina: 62, carboidrato: 0, gordura: 8 });
  });

  it('refeição com registro desmarcado não soma', () => {
    const consumo = consumoDoDia(
      [refeicao('almoco')],
      { almoco: registro({ completed: false }) },
      { almoco: [item()] }
    );

    expect(consumo.calorias).toBe(0);
  });

  it('a troca registrada vale no lugar do item do plano', () => {
    const tilapia = alimento({ id: 'tilapia', calories: 96, protein: 20, fat: 2 });
    const consumo = consumoDoDia(
      [refeicao('almoco')],
      {
        almoco: registro({
          actual_items: [{ id: 'sub_1', quantity: 100, food: tilapia, substituted_for: 'item-1' }],
        }),
      },
      { almoco: [item()] }
    );

    expect(consumo).toEqual({ calorias: 96, proteina: 20, carboidrato: 0, gordura: 2 });
  });

  it('o item extra registrado soma junto com o resto do prato', () => {
    const banana = alimento({ id: 'banana', calories: 89, protein: 1, carbs: 23, fat: 0 });
    const consumo = consumoDoDia(
      [refeicao('lanche')],
      {
        lanche: registro({
          actual_items: [
            { id: 'item-1', quantity: 100, food: alimento() },
            { id: 'extra_1', quantity: 100, food: banana, origem: 'scan' },
          ],
        }),
      },
      { lanche: [item()] }
    );

    expect(consumo).toEqual({ calorias: 254, proteina: 32, carboidrato: 23, gordura: 4 });
  });

  // Registrar pela busca ou pelo scan já é dizer "comi isto". Sem somar, o
  // prato escaneado sumia do anel até o aluno lembrar de marcar a refeição — e
  // marcá-la contaria junto o prato do plano que ele talvez nem comeu.
  it('refeição desmarcada soma só o item extra, e não o prato do plano', () => {
    const banana = alimento({ id: 'banana', calories: 89, protein: 1, carbs: 23, fat: 0 });
    const consumo = consumoDoDia(
      [refeicao('lanche')],
      {
        lanche: registro({
          completed: false,
          actual_items: [
            { id: 'item-1', quantity: 100, food: alimento() },
            { id: 'extra_1', quantity: 100, food: banana, origem: 'busca' },
          ],
        }),
      },
      { lanche: [item()] }
    );

    expect(consumo).toEqual({ calorias: 89, proteina: 1, carboidrato: 23, gordura: 0 });
  });

  // O banco devolve `numeric` como texto em alguns caminhos do PostgREST.
  it('lê macros e porção vindos como texto', () => {
    const textual = alimento({
      serving_size: '100' as unknown as number,
      calories: '165' as unknown as number,
    });
    const consumo = consumoDoDia(
      [refeicao('almoco')],
      { almoco: registro() },
      { almoco: [item({ quantity: '50' as unknown as number, food: textual })] }
    );

    expect(consumo.calorias).toBe(82.5);
  });

  it('alimento sem macro não quebra a soma', () => {
    const semDado = alimento({ calories: null, protein: null, carbs: null, fat: null });
    const consumo = consumoDoDia(
      [refeicao('almoco')],
      { almoco: registro() },
      { almoco: [item({ food: semDado })] }
    );

    expect(consumo).toEqual({ calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  });
});

describe('meta do dia', () => {
  const plano = (over: Partial<DietPlan> = {}) =>
    ({
      target_calories: 2400,
      target_protein: 180,
      target_carbs: 240,
      target_fat: 70,
      ...over,
    }) as DietPlan;

  it('usa a meta que o especialista gravou no plano', () => {
    expect(metaDoDia(plano(), [refeicao('almoco')], { almoco: [item()] })).toEqual({
      calorias: 2400,
      proteina: 180,
      carboidrato: 240,
      gordura: 70,
    });
  });

  // Plano montado refeição a refeição, sem meta digitada: a meta é o que foi prescrito.
  it('sem meta no plano, a meta é o total prescrito para o dia', () => {
    const semMeta = plano({
      target_calories: null,
      target_protein: null,
      target_carbs: null,
      target_fat: null,
    });

    expect(
      metaDoDia(semMeta, [refeicao('almoco'), refeicao('jantar')], {
        almoco: [item()],
        jantar: [item()],
      })
    ).toEqual({
      calorias: 660,
      proteina: 124,
      carboidrato: 0,
      gordura: 16,
    });
  });
});

describe('percentual da meta', () => {
  it('arredonda para inteiro', () => {
    expect(percentualDaMeta(1540, 2400)).toBe(64);
  });

  it('passa de 100 quando o aluno comeu além da meta', () => {
    expect(percentualDaMeta(2640, 2400)).toBe(110);
  });

  it('meta zerada ou negativa dá zero, e não divisão por zero', () => {
    expect(percentualDaMeta(300, 0)).toBe(0);
  });

  it('nunca é negativo', () => {
    expect(percentualDaMeta(-50, 2400)).toBe(0);
  });
});
