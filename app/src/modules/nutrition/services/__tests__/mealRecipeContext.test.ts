import { loadMealRecipeContext } from '../mealRecipeContext';

const mockConsent = jest.fn();
const mockActivePlan = jest.fn();
const mockMeals = jest.fn();
const mockLogs = jest.fn();
jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({ hasCollectionConsent: mockConsent }),
  createNutritionService: () => ({
    fetchActiveDietPlan: mockActivePlan,
    fetchDietMeals: mockMeals,
    fetchMealLogs: mockLogs,
  }),
}));

const request = { studentId: 'student-a', mealId: 'meal-a', date: '2026-10-04', canReadDiet: true };
beforeEach(() => {
  jest.clearAllMocks();
  mockConsent.mockResolvedValue(true);
  mockActivePlan.mockResolvedValue({
    id: 'plan-a',
    student_id: 'student-a',
    status: 'active',
    plan_type: 'unique',
  });
  mockMeals.mockResolvedValue([
    {
      id: 'meal-a',
      diet_plan_id: 'plan-a',
      day_of_week: null,
      name: 'Ceia',
      diet_meal_items: [
        { id: 'egg', quantity: 100, unit: 'g', food: { name: 'Ovo inteiro cozido' } },
      ],
    },
  ]);
  mockLogs.mockResolvedValue([]);
});

// Art. 6º, III e VII: usar o catálogo não autoriza ler a dieta sem o aceite vigente.
it('não lê a composição da refeição quando o consentimento está revogado', async () => {
  mockConsent.mockResolvedValue(false);
  const result = await loadMealRecipeContext(request);
  if (result.status !== 'consent_required' || mockActivePlan.mock.calls.length > 0)
    throw new Error('REFEIÇÃO EXPOSTA: a dieta foi consultada sem consentimento vigente.');
  expect(result).toEqual({ status: 'consent_required' });
  expect(mockActivePlan).not.toHaveBeenCalled();
  expect(mockMeals).not.toHaveBeenCalled();
  expect(mockLogs).not.toHaveBeenCalled();
});

it('devolve a refeição autorizada com as trocas apenas da data solicitada', async () => {
  const items = [{ id: 'yogurt', quantity: 170, unit: 'g', food: { name: 'Iogurte natural' } }];
  mockLogs.mockResolvedValue([
    {
      diet_meal_id: 'meal-a',
      student_id: 'student-a',
      logged_date: '2026-10-04',
      actual_items: items,
    },
  ]);
  expect(await loadMealRecipeContext(request)).toEqual({
    status: 'ready',
    mealName: 'Ceia',
    items,
  });
  expect(mockLogs).toHaveBeenCalledWith('student-a', '2026-10-04');
});

// Art. 6º, VII: uma resposta fora do titular não pode virar conteúdo na tela.
it('não mostra refeição de outra conta nem de outro dia de um plano cíclico', async () => {
  mockActivePlan.mockResolvedValueOnce({ id: 'plan-b', student_id: 'student-b', status: 'active' });
  expect(await loadMealRecipeContext(request)).toEqual({ status: 'not_found' });
  expect(mockMeals).not.toHaveBeenCalled();
  mockActivePlan.mockResolvedValueOnce({
    id: 'plan-a',
    student_id: 'student-a',
    status: 'active',
    plan_type: 'cyclic',
  });
  mockMeals.mockResolvedValueOnce([{ id: 'meal-a', diet_plan_id: 'plan-a', day_of_week: 1 }]);
  expect(await loadMealRecipeContext(request)).toEqual({ status: 'not_found' });
});

it('não consulta a dieta quando CASL recusa leitura ou a data é inválida', async () => {
  expect(await loadMealRecipeContext({ ...request, canReadDiet: false })).toEqual({
    status: 'forbidden',
  });
  expect(await loadMealRecipeContext({ ...request, date: '2026-02-30' })).toEqual({
    status: 'not_found',
  });
  expect(mockConsent).not.toHaveBeenCalled();
  expect(mockActivePlan).not.toHaveBeenCalled();
});
