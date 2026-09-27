import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNutritionAssistantChat } from '../useNutritionAssistantChat';

const session = {
  sessionId: 'draft-chat',
  messages: [],
  savedPlanId: 'draft-1',
  planProposal: null,
  planSaved: false,
  mealsSaved: false,
  mealsProposal: { plan_name: 'Plano', plan_type: 'unique', meals: [] },
};
const options = {
  token: 'token',
  studentId: 'student-1',
  sessionId: null,
  planId: 'draft-1',
  onSessionResolved: jest.fn(),
  onPlanApproved: jest.fn(),
};
function response(body: unknown, status = 200) {
  return {
    ok: status === 200,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  global.fetch = jest.fn().mockResolvedValue(response(session));
});

it('retoma uma dieta enviada sem permitir aprovar alterações', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(response({ ...session, readOnly: true }));
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  await act(async () => {
    result.current.approveMeals();
  });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(result.current.readOnly).toBe(true);
});

it('renovar o token não abre outra conversa de nutrição', async () => {
  const { result, rerender } = renderHook(
    ({ token }: { token: string }) => useNutritionAssistantChat({ ...options, token }),
    { initialProps: { token: 'first' } }
  );
  await waitFor(() => expect(result.current.initializing).toBe(false));
  rerender({ token: 'refreshed' });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  (global.fetch as jest.Mock).mockResolvedValue(response({ saved: [{ id: 'meal-1' }] }));
  await act(async () => {
    result.current.approveMeals();
  });
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({
    sessionId: 'draft-chat',
    planId: 'draft-1',
  });
});

it('abre e aprova no rascunho da rota, usando a sessão resolvida pelo servidor', async () => {
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('planId=draft-1'),
    expect.anything()
  );
  (global.fetch as jest.Mock).mockResolvedValue(response({ saved: [{ id: 'meal-1' }] }));
  await act(async () => {
    result.current.approveMeals();
    result.current.approveMeals();
  });
  await waitFor(() => expect(result.current.mealsProposal?.saved).toBe(true));
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({
    sessionId: 'draft-chat',
    planId: 'draft-1',
  });
});

it('falha ao abrir bloqueia envio e aprovação até tentar novamente', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ error: 'Indisponível' }, 503));
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.error).toBeTruthy();
  await act(async () => {
    result.current.sendMessage('Montar');
    result.current.approveMeals();
  });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.error).toBeNull());
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.planId).toBe('draft-1');
});

it('erro ao aprovar mantém a proposta disponível para nova tentativa', async () => {
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ error: 'Indisponível' }, 503));
  await act(async () => {
    result.current.approveMeals();
  });
  await waitFor(() => expect(result.current.saving).toBe(false));
  expect(result.current.mealsProposal?.saved).toBe(false);
  (global.fetch as jest.Mock).mockResolvedValue(response({ saved: [{ id: 'meal-1' }] }));
  await act(async () => {
    result.current.approveMeals();
  });
  await waitFor(() => expect(result.current.mealsProposal?.saved).toBe(true));
});

it('exige consentimento sem erro técnico e retoma depois da autorização', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ code: 'consent_required' }, 403));
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.consentRequired).toBe(true);
  expect(result.current.error).toBeNull();
  expect(result.current.messages).toEqual([]);
  act(() => result.current.sendMessage('Montar'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.consentRequired).toBe(false));
  expect(result.current.mealsProposal).not.toBeNull();
});

it.each([
  'approve',
  'send',
])('retira o conteúdo e pede consentimento se revogado durante %s', async (action) => {
  const { result } = renderHook(() => useNutritionAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ code: 'consent_required' }, 403));
  await act(async () => {
    if (action === 'approve') result.current.approveMeals();
    else result.current.sendMessage('Montar refeições');
  });
  await waitFor(() => expect(result.current.consentRequired).toBe(true));
  expect(result.current.messages).toEqual([]);
  expect(result.current.mealsProposal).toBeNull();
  expect(result.current.error).toBeNull();
  act(() => {
    result.current.approveMeals();
    result.current.sendMessage('Tentar');
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ code: 'consent_required' }, 403));
  await act(async () => {
    result.current.retry();
  });
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.consentRequired).toBe(true);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.consentRequired).toBe(false));
  expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain('sessionId=draft-chat');
  expect((global.fetch as jest.Mock).mock.calls[3][0]).toContain('sessionId=draft-chat');
});
