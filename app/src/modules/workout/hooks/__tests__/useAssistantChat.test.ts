import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAssistantChat } from '../useAssistantChat';

const session = {
  sessionId: 'resolved-chat',
  messages: [],
  periodization: { name: 'Treino A', phases: [] },
  savedPeriodizationId: null,
  workoutProposal: null,
  savedWorkoutTitles: [],
};
const options = {
  token: 'token',
  studentId: 'student',
  sessionId: null,
  onPeriodizationApproved: jest.fn(),
};
const response = (body: unknown, status = 200) => ({
  ok: status === 200,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

it('renovar o token mantém a conversa resolvida até a seleção explícita de outra', async () => {
  const { result, rerender } = await renderHook(
    ({ token }: { token: string }) => useAssistantChat({ ...options, token }),
    { initialProps: { token: 'first' } }
  );
  await waitFor(() => expect(result.current.initializing).toBe(false));
  await rerender({ token: 'refreshed' });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  (global.fetch as jest.Mock).mockResolvedValue(
    response({ id: 'periodization', name: 'Treino A' })
  );
  await act(async () => {
    await result.current.approvePeriodization();
  });
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({
    sessionId: 'resolved-chat',
  });
});
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  global.fetch = jest.fn().mockResolvedValue(response(session));
  jest.clearAllMocks();
});

it('aprova só uma vez na sessão resolvida, sem depender de atualizar o wizard', async () => {
  const { result } = await renderHook(() => useAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValue(
    response({ id: 'periodization', name: 'Treino A' })
  );
  await act(async () => {
    result.current.approvePeriodization();
    result.current.approvePeriodization();
  });
  await waitFor(() => expect(result.current.periodizationProposal?.savedId).toBe('periodization'));
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({
    sessionId: 'resolved-chat',
  });
});

it('falha de abertura bloqueia envio até retomar a conversa com sucesso', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({}, 503));
  const { result } = await renderHook(() => useAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.sendMessage('Montar treino'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.periodizationProposal?.data.name).toBe('Treino A'));
});

it('não aplica uma aprovação que terminou após sair da conversa', async () => {
  const { result, unmount } = await renderHook(() => useAssistantChat(options));
  await waitFor(() => expect(result.current.initializing).toBe(false));
  let finish!: (value: unknown) => void;
  (global.fetch as jest.Mock).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  await act(() => {
    void result.current.approvePeriodization();
  });
  await unmount();
  await act(async () => finish(response({ id: 'old', name: 'Antigo' })));
  expect(options.onPeriodizationApproved).not.toHaveBeenCalled();
});
