import type { NutritionSources } from '@elevapro/shared';
import { dailyCalorieGoal, intakeByDay } from '@/services/nutritionIntake';

/** Um prato de 100 g de um alimento com 400 kcal e 20 g de proteína a cada 100 g. */
const PRATO = [
  {
    id: 'item',
    quantity: 100,
    food: { serving_size: 100, calories: 400, protein: 20, carbs: 50, fat: 10 },
  },
];

const PLANO: NutritionSources['plan'] = {
  plan_type: 'unique',
  start_date: '2026-09-01',
  target_calories: null,
  target_protein: null,
  target_carbs: null,
  target_fat: null,
};

function fontes(over: Partial<NutritionSources> = {}): NutritionSources {
  return {
    plan: PLANO,
    meals: [{ id: 'almoco', day_of_week: null }],
    items: { almoco: PRATO },
    logs: [],
    ...over,
  };
}

describe('intakeByDay', () => {
  it('soma o prato da refeição marcada como feita, e conta planejadas e feitas', () => {
    const logs = [
      { logged_date: '2026-09-15', diet_meal_id: 'almoco', completed: true, actual_items: null },
    ];

    const [ontem, hoje] = intakeByDay(fontes({ logs }), '2026-09-14', '2026-09-15');

    expect(ontem).toMatchObject({ date: '2026-09-14', plannedMeals: 1, doneMeals: 0, calories: 0 });
    expect(hoje).toMatchObject({ plannedMeals: 1, doneMeals: 1, calories: 400, protein: 20 });
  });

  // Antes do plano existir não há refeição a cumprir, e o dia não pesa na aderência.
  it('antes do início do plano, o dia não tem refeição planejada', () => {
    const [dia] = intakeByDay(fontes(), '2026-08-31', '2026-08-31');

    expect(dia.plannedMeals).toBe(0);
  });
});

describe('dailyCalorieGoal', () => {
  it('usa a meta de calorias do plano quando o especialista a digitou', () => {
    const plan = { ...PLANO, target_calories: 2100 };

    expect(dailyCalorieGoal(fontes({ plan }))).toBe(2100);
  });

  // Plano cíclico sem meta digitada: a linha não pode mudar com o dia em que a tela abre.
  it('sem meta digitada, é a média do prescrito nos dias da semana que têm refeição', () => {
    const plan = { ...PLANO, plan_type: 'cyclic' as const };
    const meals = [
      { id: 'seg', day_of_week: 1 },
      { id: 'ter', day_of_week: 2 },
    ];
    const items = { seg: PRATO, ter: [{ ...PRATO[0], quantity: 200 }] };

    expect(dailyCalorieGoal(fontes({ plan, meals, items }))).toBe(600);
  });

  it('plano sem meta e sem prescrição não tem meta, e sem plano também não', () => {
    expect(dailyCalorieGoal(fontes({ meals: [], items: {} }))).toBeNull();
    expect(dailyCalorieGoal(fontes({ plan: null }))).toBeNull();
  });
});
