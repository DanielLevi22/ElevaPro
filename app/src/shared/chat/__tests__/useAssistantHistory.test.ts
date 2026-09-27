import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAssistantHistory } from '../useAssistantHistory';

const sessions = [
  { id: 'workout', module: 'workout', title: 'Treino A', created_at: '', updated_at: '' },
  { id: 'diet', module: 'nutrition', title: 'Dieta A', created_at: '', updated_at: '' },
];
const response = (body: unknown, status = 200) => ({
  ok: status === 200,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

it.each([401, 403])('limpa títulos e bloqueia ações quando perde acesso (%s)', async (status) => {
  const { result } = renderHook(() => useAssistantHistory('token', 'student'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({}, status));
  await act(async () => {
    await result.current.rename('diet', 'Não permitido');
  });
  expect(result.current.sessions).toEqual([]);
  expect(result.current.consentRequired).toBe(false);
  expect(result.current.error).toBeTruthy();
  await act(async () => {
    expect(await result.current.create('nutrition')).toBeNull();
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
// Art. 11: revogação impede uso das conversas, inclusive nas ações do histórico.
it('retira títulos ao exigir consentimento e só libera após confirmação do servidor', async () => {
  const { result } = renderHook(() => useAssistantHistory('token', 'student'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ code: 'consent_required' }, 403));
  await act(async () => {
    await result.current.archive('diet');
  });
  expect(result.current.consentRequired).toBe(true);
  expect(result.current.sessions).toEqual([]);
  expect(result.current.error).toBeNull();
  await act(async () => {
    expect(await result.current.create('workout')).toBeNull();
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  await act(async () => {
    await result.current.refresh();
  });
  expect(result.current.consentRequired).toBe(false);
  expect(result.current.denied).toBe(false);
  expect(result.current.sessions).toHaveLength(2);
});

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  global.fetch = jest.fn().mockResolvedValue(response({ sessions }));
});

it('lista treino e nutrição do aluno e preserva o título quando renomear falha', async () => {
  const { result } = renderHook(() => useAssistantHistory('token', 'student'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.sessions.map((item) => item.module)).toEqual(['workout', 'nutrition']);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({}, 503));
  await act(async () => {
    expect(await result.current.rename('diet', 'Novo título')).toBe(false);
  });
  expect(result.current.sessions[1].title).toBe('Dieta A');
  expect(result.current.error).toBeTruthy();
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ success: true }));
  await act(async () => {
    expect(await result.current.rename('diet', 'Novo título')).toBe(true);
  });
  expect(result.current.sessions[1].title).toBe('Novo título');
});

// Art. 6°, VII: respostas antigas não podem preencher o histórico do próximo aluno.
it('descarta a resposta atrasada ao trocar de aluno', async () => {
  let finish!: (value: unknown) => void;
  (global.fetch as jest.Mock).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ sessions: [] }));
  const { result, rerender } = renderHook(
    ({ studentId }: { studentId: string }) => useAssistantHistory('token', studentId),
    { initialProps: { studentId: 'student-a' } }
  );
  rerender({ studentId: 'student-b' });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    finish(response({ sessions }));
  });
  if (result.current.sessions.length)
    throw new Error('HISTÓRICO ENTRE ALUNOS: resposta antiga ficou visível');
});

it.each([
  'workout',
  'nutrition',
] as const)('cria conversa de %s só uma vez em toques repetidos', async (module) => {
  const { result } = renderHook(() => useAssistantHistory('token', 'student'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ sessionId: 'new-chat' }));
  await act(async () => {
    const first = result.current.create(module);
    expect(await result.current.create(module)).toBeNull();
    expect(await first).toEqual({ id: 'new-chat', module });
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({ module });
});

it('arquiva apenas após confirmação do servidor e mantém a outra conversa', async () => {
  const { result } = renderHook(() => useAssistantHistory('token', 'student'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({}, 503));
  await act(async () => {
    expect(await result.current.archive('diet')).toBe(false);
  });
  expect(result.current.sessions).toHaveLength(2);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ success: true }));
  await act(async () => {
    expect(await result.current.archive('diet')).toBe(true);
  });
  expect(result.current.sessions.map((item) => item.id)).toEqual(['workout']);
});
