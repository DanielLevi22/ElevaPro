import { draftInput } from '../dietDraft';

const base = {
  studentId: 'aluno-1',
  ownPlan: false,
  planName: '  Cutting  ',
  targetCalories: 2000,
  macroGrams: { protein: 150, carbs: 200, fat: 67 },
  durationWeeks: 4,
  preferences: {
    dietary_restrictions: ['lactose_free' as const],
    meals_per_day: 5,
    allows_supplements: false,
    free_meal_days: [0],
  },
};

describe('draftInput', () => {
  it('o plano do especialista leva o especialista como autor', () => {
    expect(draftInput(base, 'esp-1', '2026-10-01')).toMatchObject({
      student_id: 'aluno-1',
      specialist_id: 'esp-1',
      name: 'Cutting',
    });
  });

  // A RLS só deixa o Praticante criar plano sem especialista (0073).
  it('o plano do próprio Praticante vai sem especialista', () => {
    expect(
      draftInput({ ...base, ownPlan: true }, 'aluno-1', '2026-10-01').specialist_id
    ).toBeNull();
  });

  it('vigência pela duração em semanas, a partir de hoje', () => {
    expect(draftInput(base, 'esp-1', '2026-10-01')).toMatchObject({
      start_date: '2026-10-01',
      end_date: '2026-10-29',
    });
  });

  it('leva metas em gramas e as preferências', () => {
    expect(draftInput(base, 'esp-1', '2026-10-01')).toMatchObject({
      target_calories: 2000,
      target_protein: 150,
      target_carbs: 200,
      target_fat: 67,
      dietary_restrictions: ['lactose_free'],
      meals_per_day: 5,
    });
  });
});
