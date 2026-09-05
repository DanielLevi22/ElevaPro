import type { DietMeal, DietMealItem } from '@elevapro/shared';
import { lembretesDaDieta } from '../lembretesDaDieta';

/**
 * O que vira lembrete e o que não vira.
 *
 * A regra é sobre o dado, não sobre o aparelho: refeição sem hora ou sem dia
 * não tem quando avisar, e a única alternativa a descartá-la seria inventar um
 * horário — o aluno receberia aviso para comer numa hora que ninguém prescreveu.
 */

function refeicao(over: Partial<DietMeal> = {}): DietMeal {
  return {
    id: 'ref-1',
    name: 'Almoço',
    meal_time: '12:00',
    day_of_week: 1,
    ...over,
  } as DietMeal;
}

function item(nome: string | null): DietMealItem {
  return { id: `i-${nome}`, food: nome ? { name: nome } : undefined } as DietMealItem;
}

describe('lembretes da dieta', () => {
  it('vira lembrete com hora, dia e nome', () => {
    const [lembrete] = lembretesDaDieta([refeicao()], {});

    expect(lembrete).toMatchObject({
      mealId: 'ref-1',
      mealName: 'Almoço',
      mealTime: '12:00',
      dayOfWeek: 1,
    });
  });

  it('leva o que comer, para o aviso dizer mais que "está na hora"', () => {
    const [lembrete] = lembretesDaDieta([refeicao()], {
      'ref-1': [item('Frango grelhado'), item('Arroz integral')],
    });

    expect(lembrete.foodNames).toEqual(['Frango grelhado', 'Arroz integral']);
  });

  it('item sem alimento carregado não vira nome vazio no aviso', () => {
    const [lembrete] = lembretesDaDieta([refeicao()], {
      'ref-1': [item('Frango grelhado'), item(null)],
    });

    expect(lembrete.foodNames).toEqual(['Frango grelhado']);
  });

  it('refeição sem hora não vira lembrete', () => {
    expect(lembretesDaDieta([refeicao({ meal_time: null })], {})).toEqual([]);
  });

  it('refeição sem dia não vira lembrete', () => {
    expect(lembretesDaDieta([refeicao({ day_of_week: null })], {})).toEqual([]);
  });

  // `!meal.day_of_week` descartaria o domingo inteiro, e ninguém veria.
  it('domingo é dia zero, não ausência de dia', () => {
    const [lembrete] = lembretesDaDieta([refeicao({ day_of_week: 0 })], {});

    expect(lembrete?.dayOfWeek).toBe(0);
  });

  it('refeição sem nome não deixa o aviso sem assunto', () => {
    const [lembrete] = lembretesDaDieta([refeicao({ name: undefined })], {});

    expect(lembrete.mealName).toBe('Refeição');
  });

  it('descarta só a inválida, não a lista', () => {
    const lembretes = lembretesDaDieta(
      [refeicao(), refeicao({ id: 'ref-2', meal_time: null }), refeicao({ id: 'ref-3' })],
      {}
    );

    expect(lembretes.map((l) => l.mealId)).toEqual(['ref-1', 'ref-3']);
  });
});
