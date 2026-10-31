import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as renderView, screen } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';
import { useEffect as mockUseEffect } from 'react';
import { SelfGuidedPlanActions } from '../../components/recipes/SelfGuidedPlanActions';
import CookingScreen from '../CookingScreen';
import { MealRecipeScreen } from '../MealRecipeScreen';

const mockCatalogFetch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockConsent = jest.fn();
const mockActivePlan = jest.fn();
const mockMeals = jest.fn();
const mockLogs = jest.fn();
const mockWrite = jest.fn();
const testClients: QueryClient[] = [];
let mockStudentId = 'student-a';
jest.mock('@/shared/bff', () => ({
  getBff: (...args: unknown[]) => mockCatalogFetch(...args),
  bffUrl: (path: string) => `https://app.test${path}`,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useFocusEffect: (callback: () => undefined | (() => void)) => mockUseEffect(callback, [callback]),
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn(), deactivateKeepAwake: jest.fn() }));
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('@/auth', () => ({
  useAuthStore: (
    select: (state: {
      user: { id: string };
      abilities: { can: () => boolean };
      session: { access_token: string };
    }) => unknown
  ) =>
    select({
      user: { id: mockStudentId },
      abilities: { can: () => true },
      session: { access_token: 'token' },
    }),
}));
jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({ hasCollectionConsent: mockConsent }),
  createNutritionService: () => ({
    fetchActiveDietPlan: mockActivePlan,
    fetchDietMeals: mockMeals,
    fetchMealLogs: mockLogs,
    toggleMealCompletion: mockWrite,
  }),
}));

afterEach(() => {
  for (const client of testClients.splice(0)) client.clear();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStudentId = 'student-a';
  const recipes = require('../../../../../../web/src/modules/nutrition/services/recipes/catalog.json');
  const manifest = require('../../../../../../web/src/modules/nutrition/services/recipes/mediaManifest.json');
  mockCatalogFetch.mockResolvedValue({
    version: 1,
    recipes,
    images: manifest.assets.map((asset: { path: string }) => ({ ...asset, url: `/${asset.path}` })),
  });
  mockConsent.mockResolvedValue(true);
  mockActivePlan.mockImplementation(async (id: string) => ({
    id: `plan-${id}`,
    student_id: id,
    status: 'active',
    plan_type: 'unique',
  }));
  mockMeals.mockResolvedValue([
    {
      id: 'meal-a',
      diet_plan_id: 'plan-student-a',
      day_of_week: null,
      name: 'Lanche',
      diet_meal_items: [
        { id: 'yogurt', quantity: 170, unit: 'g', food: { name: 'Iogurte natural' } },
        { id: 'oats', quantity: 30, unit: 'g', food: { name: 'Aveia em flocos' } },
        { id: 'banana', quantity: 100, unit: 'g', food: { name: 'Banana nanica' } },
      ],
    },
  ]);
  mockLogs.mockResolvedValue([]);
});

it('escolher um prato não navega; só Ver preparo abre a receita, sem alimentos na URL', async () => {
  await render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  await fireEvent.press(await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana'));
  expect(mockPush).not.toHaveBeenCalled();
  expect(screen.getByText('170 g de Iogurte natural')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Ver preparo'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/nutrition/cooking',
    params: { mealId: 'meal-a', date: '2026-10-04', recipeId: 'yogurt-bowl' },
  });
  expect(mockWrite).not.toHaveBeenCalled();
});

it('concluir preparo não marca consumo e o guia atual funciona sem selecionar prato', async () => {
  await render(<CookingScreen mealId="meal-a" date="2026-10-04" />);
  await screen.findByText('Preparo da refeição');
  for (let step = 0; step < 4; step++) await fireEvent.press(screen.getByLabelText('Próximo'));
  await fireEvent.press(screen.getByLabelText('Concluir preparo'));
  expect(screen.getByText('Preparo concluído')).toBeTruthy();
  expect(mockWrite).not.toHaveBeenCalled();
});

it('permite recuperar o cardápio na mesma tela depois de revisar o consentimento', async () => {
  mockConsent.mockResolvedValue(false);
  await render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  await screen.findByText('Revisar consentimento');
  expect(mockMeals).not.toHaveBeenCalled();
  mockConsent.mockResolvedValue(true);
  await fireEvent.press(screen.getByText('Já revisei, tentar novamente'));
  await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana');
});

it('preserva o acesso do Praticante à criação de plano para a própria conta', async () => {
  await render(<SelfGuidedPlanActions />);
  await fireEvent.press(screen.getByText('Criar plano'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/nutrition/wizard/start',
    params: { studentId: 'student-a' },
  });
});

// Art. 6º, VII: resposta atrasada da conta anterior não pode reaparecer na tela.
it('troca de conta limpa pratos e seleção imediatamente', async () => {
  const view = await render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  await fireEvent.press(await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana'));
  mockStudentId = 'student-b';
  await view.rerender(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  expect(screen.queryByText('170 g de Iogurte natural')).toBeNull();
  expect(screen.queryByLabelText('Ver preparo')).toBeNull();
  await screen.findByText('Essa refeição não está no seu plano ativo ou na data aberta.');
});

it('mostra o prato importado do catálogo e abre o preparo dele com a foto', async () => {
  const QUINOA = '11111111-1111-4111-8111-111111111111';
  mockMeals.mockResolvedValue([
    {
      id: 'meal-a',
      diet_plan_id: 'plan-student-a',
      day_of_week: null,
      name: 'Almoço',
      diet_meal_items: [
        { id: 'quinoa', quantity: 120, unit: 'g', food: { id: QUINOA, name: 'Quinoa cozida' } },
      ],
    },
  ]);
  mockCatalogFetch.mockResolvedValue({
    version: 1,
    recipes: [],
    images: [],
    dishes: [
      {
        id: 'candidate-0000000000000001',
        title: 'Prato: Quinoa cozida',
        imageUrl: 'https://cdn.test/quinoa.jpg',
        foodIds: [QUINOA],
      },
    ],
  });
  await render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  await fireEvent.press(await screen.findByLabelText('Escolher Prato: Quinoa cozida'));
  expect(screen.getByText('Leva todos os alimentos da sua refeição.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Ver preparo'));
  const recipeId = 'candidate-0000000000000001';
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/nutrition/cooking',
    params: { mealId: 'meal-a', date: '2026-10-04', recipeId },
  });
  await render(<CookingScreen mealId="meal-a" date="2026-10-04" recipeId={recipeId} />);
  expect(await screen.findByLabelText('Imagem ilustrativa de Prato: Quinoa cozida')).toBeTruthy();
  expect(mockWrite).not.toHaveBeenCalled();
});

function render(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  testClients.push(client);
  return renderView(element, {
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
