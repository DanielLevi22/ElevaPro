import { dayTotals, reviewNotes } from '../dietReview';

const rice = { serving_size: 100, calories: 130, protein: 2.5, carbs: 28, fat: 0.3 };
const chicken = { serving_size: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 };

function meal(
  day: number | null,
  items: { food: typeof rice & { name?: string; category?: string }; quantity: number }[]
) {
  return { day_of_week: day, diet_meal_items: items.map((i) => ({ ...i, unit: 'g' })) };
}

describe('dayTotals', () => {
  it('dieta única soma tudo num dia só, sem dia da semana', () => {
    const totals = dayTotals(
      [meal(null, [{ food: rice, quantity: 200 }]), meal(null, [{ food: chicken, quantity: 100 }])],
      'unique'
    );

    expect(totals).toHaveLength(1);
    expect(totals[0].dayOfWeek).toBeNull();
    expect(Math.round(totals[0].macros.calorias)).toBe(425);
  });

  it('dieta cíclica soma cada dia separado, em ordem de domingo a sábado', () => {
    const totals = dayTotals(
      [meal(2, [{ food: chicken, quantity: 100 }]), meal(1, [{ food: rice, quantity: 100 }])],
      'cyclic'
    );

    expect(totals.map((t) => t.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('reviewNotes', () => {
  const target = { calorias: 2000, proteina: 150 };

  it.each([
    ['gluten_free', 'Pão integral', true],
    ['gluten_free', 'Pão sem glúten', false],
    ['lactose_free', 'Iogurte natural', true],
    ['lactose_free', 'Iogurte zero lactose', false],
    ['vegan', 'Ovos mexidos', true],
    ['vegan', 'Leite de soja', false],
    ['vegetarian', 'Carne bovina', true],
    ['vegetarian', 'Carne vegetariana', false],
  ] as const)('restrição %s e alimento %s: possível conflito=%s', (restriction, name, conflict) => {
    const meals = [meal(null, [{ food: { ...chicken, name }, quantity: 100 }])];
    const notes = reviewNotes(dayTotals(meals, 'unique'), target, {
      meals,
      restrictions: [restriction],
    });
    expect(notes.some((note) => note.startsWith('Possível conflito:'))).toBe(conflict);
    expect(notes.join(' ')).toContain('Conferência parcial por nome e categoria');
  });

  it('avisa possível conflito de alimento com a restrição antes do envio', () => {
    const meals = [
      meal(null, [
        { food: { ...chicken, name: 'Frango grelhado', category: 'Aves' }, quantity: 100 },
      ]),
    ];
    const notes = reviewNotes(dayTotals(meals, 'unique'), target, {
      meals,
      restrictions: ['vegetarian'],
    });
    expect(notes.join(' ')).toContain('Frango grelhado');
    expect(notes.join(' ')).toContain('Vegetariana');
  });

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

  it('dias vazios continuam incompletos mesmo quando outro dia atinge a meta', () => {
    const totals = dayTotals([meal(1, [{ food: chicken, quantity: 100 }])], 'cyclic');
    expect(totals.every((day) => day.macros.calorias > 0)).toBe(false);
    expect(reviewNotes(totals, { calorias: 165, proteina: 31 })).toContain('6 dias sem alimentos.');
    expect(reviewNotes(totals, { calorias: 165, proteina: 31 })).not.toContain(
      'Proteína bate a meta.'
    );
  });
});
