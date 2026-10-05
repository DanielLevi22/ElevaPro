import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as renderView, screen } from '@testing-library/react-native';
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
  render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  fireEvent.press(await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana'));
  expect(mockPush).not.toHaveBeenCalled();
  expect(screen.getByText('170 g de Iogurte natural')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Ver preparo'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/nutrition/cooking',
    params: { mealId: 'meal-a', date: '2026-10-04', recipeId: 'yogurt-bowl' },
  });
  expect(mockWrite).not.toHaveBeenCalled();
});

it('concluir preparo não marca consumo e o guia atual funciona sem selecionar prato', async () => {
  render(<CookingScreen mealId="meal-a" date="2026-10-04" />);
  await screen.findByText('Preparo da refeição');
  for (let step = 0; step < 4; step++) fireEvent.press(screen.getByLabelText('Próximo'));
  fireEvent.press(screen.getByLabelText('Concluir preparo'));
  expect(screen.getByText('Preparo concluído')).toBeTruthy();
  expect(mockWrite).not.toHaveBeenCalled();
});

it('permite recuperar o cardápio na mesma tela depois de revisar o consentimento', async () => {
  mockConsent.mockResolvedValue(false);
  render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  await screen.findByText('Revisar consentimento');
  expect(mockMeals).not.toHaveBeenCalled();
  mockConsent.mockResolvedValue(true);
  fireEvent.press(screen.getByText('Já revisei, tentar novamente'));
  await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana');
});

it('preserva o acesso do Praticante à criação de plano para a própria conta', () => {
  render(<SelfGuidedPlanActions />);
  fireEvent.press(screen.getByText('Criar plano'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/nutrition/wizard/start',
    params: { studentId: 'student-a' },
  });
});

// Art. 6º, VII: resposta atrasada da conta anterior não pode reaparecer na tela.
it('troca de conta limpa pratos e seleção imediatamente', async () => {
  const view = render(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />);
  fireEvent.press(await screen.findByLabelText('Escolher Bowl de iogurte, aveia e banana'));
  mockStudentId = 'student-b';
  act(() => view.rerender(<MealRecipeScreen mealId="meal-a" date="2026-10-04" />));
  expect(screen.queryByText('170 g de Iogurte natural')).toBeNull();
  expect(screen.queryByLabelText('Ver preparo')).toBeNull();
  await screen.findByText('Essa refeição não está no seu plano ativo ou na data aberta.');
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
