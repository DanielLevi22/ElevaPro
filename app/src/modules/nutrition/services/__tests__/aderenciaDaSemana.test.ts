import type { DietMeal, DietMealItem, Food, MealLog } from '@elevapro/shared';
import { aderenciaDaSemana } from '../aderenciaDaSemana';

/**
 * A tela de aderência do kit: uma barra por dia, de segunda a domingo, com o
 * percentual de refeições feitas sobre as planejadas.
 *
 * Dia futuro e dia sem refeição planejada são "—", e não 0%: zero diria que o
 * aluno falhou num dia que ainda não aconteceu, ou em que não havia o que
 * cumprir.
 */

const frango = {
  id: 'frango',
  serving_size: 100,
  calories: 200,
  protein: 30,
  carbs: 0,
  fat: 5,
} as Food;

function refeicao(id: string, dia: number | null): DietMeal {
  return { id, name: id, day_of_week: dia } as DietMeal;
}

function feita(refeicaoId: string, data: string, completed = true): MealLog {
  return { diet_meal_id: refeicaoId, logged_date: data, completed, actual_items: null } as MealLog;
}

const itens: Record<string, DietMealItem[]> = {
  cafe: [{ id: 'i1', quantity: 100, food: frango } as DietMealItem],
  almoco: [{ id: 'i2', quantity: 200, food: frango } as DietMealItem],
};

// Quarta-feira, 12 de agosto de 2026: a semana vai de 10 (segunda) a 16 (domingo).
const QUARTA = '2026-08-12';

describe('aderência da semana', () => {
  it('a semana começa na segunda e tem sete dias, como no kit', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [],
      registros: [],
      itensDoPlano: {},
    });

    expect(semana.dias.map((d) => d.data)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
    expect(semana.dias.map((d) => d.rotulo)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
  });

  it('percentual do dia é refeições feitas sobre planejadas', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null), refeicao('almoco', null)],
      registros: [
        feita('cafe', '2026-08-10'),
        feita('almoco', '2026-08-10'),
        feita('cafe', '2026-08-11'),
      ],
      itensDoPlano: itens,
    });

    expect(semana.dias.slice(0, 3).map((d) => d.percentual)).toEqual([100, 50, 0]);
  });

  it('dia futuro é "—", e não zero', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null)],
      registros: [],
      itensDoPlano: itens,
    });

    expect(semana.dias.slice(3).map((d) => d.percentual)).toEqual([null, null, null, null]);
  });

  it('dia sem refeição planejada no plano cíclico é "—"', () => {
    // Só segunda (1) tem refeição.
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'cyclic',
      refeicoes: [refeicao('cafe', 1)],
      registros: [feita('cafe', '2026-08-10')],
      itensDoPlano: itens,
    });

    expect(semana.dias.slice(0, 3).map((d) => d.percentual)).toEqual([100, null, null]);
  });

  it('registro desmarcado não conta como feita', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null)],
      registros: [feita('cafe', '2026-08-10', false)],
      itensDoPlano: itens,
    });

    expect(semana.dias[0].percentual).toBe(0);
  });

  it('o dia com 90% ou mais fica em destaque, e 89% não', () => {
    const dez = Array.from({ length: 10 }, (_, i) => refeicao(`r${i}`, null));
    const nove = dez.slice(0, 9).map((r) => feita(r.id, '2026-08-10'));
    const oito = dez.slice(0, 8).map((r) => feita(r.id, '2026-08-11'));

    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: dez,
      registros: [...nove, ...oito],
      itensDoPlano: {},
    });

    expect(semana.dias[0]).toMatchObject({ percentual: 90, destaque: true });
    expect(semana.dias[1]).toMatchObject({ percentual: 80, destaque: false });
  });

  it('a aderência da semana soma as refeições dos dias que já aconteceram', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null), refeicao('almoco', null)],
      registros: [
        feita('cafe', '2026-08-10'),
        feita('almoco', '2026-08-10'),
        feita('cafe', '2026-08-11'),
      ],
      itensDoPlano: itens,
    });

    // 3 feitas de 6 planejadas (segunda, terça e hoje).
    expect(semana.aderencia).toBe(50);
  });

  it('a média de kcal considera só os dias com alguma refeição feita', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null), refeicao('almoco', null)],
      registros: [
        feita('cafe', '2026-08-10'),
        feita('almoco', '2026-08-10'),
        feita('cafe', '2026-08-11'),
      ],
      itensDoPlano: itens,
    });

    // Segunda 200 + 400 = 600; terça 200; quarta sem registro fica fora.
    expect(semana.mediaDeCalorias).toBe(400);
  });

  it('sem nenhum registro, aderência é zero e a média de kcal não existe', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null)],
      registros: [],
      itensDoPlano: itens,
    });

    expect(semana.aderencia).toBe(0);
    expect(semana.mediaDeCalorias).toBeNull();
  });

  it('sem refeição planejada na semana, a aderência não existe', () => {
    const semana = aderenciaDaSemana({
      hoje: QUARTA,
      tipoDoPlano: 'unique',
      refeicoes: [],
      registros: [],
      itensDoPlano: {},
    });

    expect(semana.aderencia).toBeNull();
  });

  // Domingo é o último dia da semana do kit, mas o dia 0 do `day_of_week`.
  it('no domingo, a semana é a que começou na segunda anterior', () => {
    const semana = aderenciaDaSemana({
      hoje: '2026-08-16',
      tipoDoPlano: 'cyclic',
      refeicoes: [refeicao('cafe', 0)],
      registros: [feita('cafe', '2026-08-16')],
      itensDoPlano: itens,
    });

    expect(semana.dias[0].data).toBe('2026-08-10');
    expect(semana.dias[6]).toMatchObject({ data: '2026-08-16', percentual: 100 });
  });
});
