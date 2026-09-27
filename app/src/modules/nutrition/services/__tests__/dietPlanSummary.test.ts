import { dayCalories, formatKcal, mealCalories, planSummaryLine } from '../dietPlanSummary';

const arroz = { serving_size: 100, calories: 130, protein: 2.5, carbs: 28, fat: 0.3 };

function meal(quantity: number) {
  return { diet_meal_items: [{ food: arroz, quantity, unit: 'g' }] };
}

describe('dietPlanSummary', () => {
  it('soma as kcal dos itens da refeição, pela porção de referência', () => {
    expect(mealCalories(meal(150))).toBeCloseTo(195);
  });

  it('soma as refeições do dia', () => {
    expect(dayCalories([meal(100), meal(200)])).toBeCloseTo(390);
  });

  it('escreve kcal com o separador de milhar brasileiro', () => {
    expect(formatKcal(2240)).toBe('2.240');
    expect(formatKcal(980.6)).toBe('981');
  });

  it('resume o plano como o kit: refeições, kcal e restrições', () => {
    expect(planSummaryLine(5, 2238, ['lactose_free'])).toBe(
      '5 refeições · 2.238 kcal · sem lactose'
    );
    expect(planSummaryLine(1, 500, [])).toBe('1 refeição · 500 kcal');
  });
});
