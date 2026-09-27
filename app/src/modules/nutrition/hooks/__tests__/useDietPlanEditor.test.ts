import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';
import { useDietPlanEditor } from '../useDietPlanEditor';

let mockStatus = 'active';
let mockWriteFailure = false;
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));
jest.mock('@/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'specialist-1' }, abilities: { can: () => true } }),
}));
jest.mock('@/components/ui/appAlert', () => ({ showAlert: jest.fn() }));

beforeEach(() => {
  mockStatus = 'active';
  mockWriteFailure = false;
  mockSupabaseBuilder.update.mockClear();
  mockSupabaseBuilder.insert.mockClear();
  mockSupabaseBuilder.delete.mockClear();
  mockSupabase.rpc.mockClear();
  mockSupabase.from.mockImplementation((table?: string) => ({
    ...mockSupabaseBuilder,
    single: jest.fn(async () => ({
      data: {
        id: 'plan-1',
        specialist_id: 'specialist-1',
        student_id: 'student-1',
        status: mockStatus,
        plan_type: 'unique',
      },
      error: null,
    })),
    // biome-ignore lint/suspicious/noThenProperty: fronteira thenable do PostgREST
    then: jest.fn((resolve: (result: unknown) => unknown) =>
      resolve({
        data: table === 'diet_meals' ? [] : null,
        error:
          table === 'diet_meal_items' && mockWriteFailure ? { message: 'Falha simulada' } : null,
      })
    ),
  }));
});

// Art. 6°, V: ler uma prescrição enviada não autoriza reescrevê-la ao vivo.
it('plano enviado não aceita edição nem envio pelo editor de rascunho', async () => {
  const { result } = renderHook(() => useDietPlanEditor('plan-1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.canEdit).toBe(false);
  await act(async () => {
    await result.current.saveMeal({
      name: 'Outra refeição',
      meal_time: null,
      prep_minutes: null,
      servings: null,
    });
    await result.current.deleteMeal('meal-1');
    await result.current.setItemQuantity('item-1', 300);
    await result.current.send('Mudança indevida');
  });
  if (
    [
      mockSupabaseBuilder.update,
      mockSupabaseBuilder.insert,
      mockSupabaseBuilder.delete,
      mockSupabase.rpc,
    ].some((operation) => operation.mock.calls.length)
  ) {
    throw new Error('PRESCRIÇÃO REESCRITA: o editor gravou diretamente no plano enviado');
  }
});

it('o autor pode continuar a montagem de um rascunho', async () => {
  mockStatus = 'draft';
  const { result } = renderHook(() => useDietPlanEditor('plan-1'));
  await waitFor(() => expect(result.current.canEdit).toBe(true));
});

it('não sinaliza alimentos salvos quando a gravação falha e permite tentar novamente', async () => {
  mockStatus = 'draft';
  const { result } = renderHook(() => useDietPlanEditor('plan-1'));
  await waitFor(() => expect(result.current.canEdit).toBe(true));
  mockWriteFailure = true;
  await act(async () => {
    expect(await result.current.addFoods('meal-1', [])).toBe(false);
  });
  mockWriteFailure = false;
  await act(async () => {
    expect(await result.current.addFoods('meal-1', [])).toBe(true);
  });
});
