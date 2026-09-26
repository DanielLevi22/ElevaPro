import { dayTotals, reviewNotes } from '../dietReview';

const arroz = { serving_size: 100, calories: 130, protein: 2.5, carbs: 28, fat: 0.3 };
const frango = { serving_size: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 };

function meal(day: number | null, items: { food: typeof arroz; quantity: number }[]) {
  return { day_of_week: day, diet_meal_items: items.map((i) => ({ ...i, unit: 'g' })) };
}

describe('dayTotals', () => {
  it('dieta única soma tudo num dia só, sem dia da semana', () => {
    const totals = dayTotals(
      [meal(null, [{ food: arroz, quantity: 200 }]), meal(null, [{ food: frango, quantity: 100 }])],
      'unique'
    );

    expect(totals).toHaveLength(1);
    expect(totals[0].dayOfWeek).toBeNull();
    expect(Math.round(totals[0].macros.calorias)).toBe(425);
  });

  it('dieta cíclica soma cada dia separado, em ordem de domingo a sábado', () => {
    const totals = dayTotals(
      [meal(2, [{ food: frango, quantity: 100 }]), meal(1, [{ food: arroz, quantity: 100 }])],
      'cyclic'
    );

    expect(totals.map((t) => t.dayOfWeek)).toEqual([1, 2]);
  });
});

describe('reviewNotes', () => {
  const target = { calorias: 2000, proteina: 150 };

  it('diz quando energia e proteína batem a meta em todos os dias', () => {
    const notes = reviewNotes(
      [{ dayOfWeek: null, macros: { calorias: 1980, proteina: 155, carboidrato: 0, gordura: 0 } }],
      target
    );

    expect(notes).toEqual(['Calorias dentro da meta.', 'Proteína bate a meta.']);
  });

  it('aponta o dia que passou da meta e em quanto', () => {
    const notes = reviewNotes(
      [
        { dayOfWeek: 1, macros: { calorias: 2000, proteina: 150, carboidrato: 0, gordura: 0 } },
        { dayOfWeek: 2, macros: { calorias: 2280, proteina: 150, carboidrato: 0, gordura: 0 } },
      ],
      target
    );

    expect(notes[0]).toBe('Terça ficou 280 kcal acima da meta.');
  });

  it('avisa a proteína abaixo da meta, contando os dias', () => {
    const notes = reviewNotes(
      [
        { dayOfWeek: 1, macros: { calorias: 2000, proteina: 100, carboidrato: 0, gordura: 0 } },
        { dayOfWeek: 3, macros: { calorias: 2000, proteina: 110, carboidrato: 0, gordura: 0 } },
      ],
      target
    );

    expect(notes).toContain('Proteína abaixo da meta em 2 dias.');
  });

  it('plano sem nenhum alimento não finge estar na meta', () => {
    expect(reviewNotes([], target)).toEqual(['Nenhum alimento montado ainda.']);
  });
});
