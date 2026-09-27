import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AssistantHistoryPanel } from '../AssistantHistoryPanel';

const sessions = [
  {
    id: 'workout',
    module: 'workout',
    title: 'Treino A',
    created_at: '',
    updated_at: '2026-09-27T12:00:00Z',
  },
  {
    id: 'diet',
    module: 'nutrition',
    title: 'Dieta A',
    created_at: '',
    updated_at: '2026-09-27T13:00:00Z',
  },
];
const response = (body: unknown) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => body,
});
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  global.fetch = jest.fn().mockResolvedValue(response({ sessions }));
});

it('retoma a conversa escolhida com seu módulo, não a mais recente do aluno', async () => {
  const onSelect = jest.fn();
  render(
    <AssistantHistoryPanel
      token="token"
      studentId="student"
      canWorkout
      canNutrition
      onSelect={onSelect}
      onClose={jest.fn()}
    />
  );
  fireEvent.press(await screen.findByText('Treino A'));
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'workout', module: 'workout' })
  );
  fireEvent.press(screen.getByText('Dieta A'));
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'diet', module: 'nutrition' })
  );
});

it('renomeia a conversa no histórico e mantém a outra', async () => {
  render(
    <AssistantHistoryPanel
      token="token"
      studentId="student"
      canWorkout
      canNutrition
      onSelect={jest.fn()}
      onClose={jest.fn()}
    />
  );
  await screen.findByText('Dieta A');
  fireEvent.press(screen.getAllByText('Renomear')[1]);
  fireEvent.changeText(screen.getByLabelText('Título da conversa'), 'Dieta revisada');
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ success: true }));
  fireEvent.press(screen.getByText('Salvar título'));
  await waitFor(() => expect(screen.getByText('Dieta revisada')).toBeTruthy());
  expect(screen.getByText('Treino A')).toBeTruthy();
});

it('não oferece criação nem retomada do módulo sem permissão', async () => {
  render(
    <AssistantHistoryPanel
      token="token"
      studentId="student"
      canWorkout={false}
      canNutrition
      onSelect={jest.fn()}
      onClose={jest.fn()}
    />
  );
  await screen.findByText('Dieta A');
  expect(screen.queryByText('Treino A')).toBeNull();
  expect(screen.queryByText('Nova conversa de treino')).toBeNull();
  expect(screen.getByText('Nova conversa de nutrição')).toBeTruthy();
});

// Art. 11: o especialista não pode aceitar o tratamento em nome do titular.
it('abre o modal de consentimento sem erro técnico nem aceite pelo especialista', async () => {
  const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  (global.fetch as jest.Mock).mockResolvedValue({
    ...response({ error: 'O aluno precisa autorizar.', code: 'consent_required' }),
    ok: false,
    status: 403,
  });
  const onSelect = jest.fn();
  render(
    <AssistantHistoryPanel
      token="token"
      studentId="student"
      canWorkout
      canNutrition
      onSelect={onSelect}
      onClose={jest.fn()}
    />
  );
  expect(await screen.findByText('Consentimento do aluno')).toBeTruthy();
  expect(screen.queryByText(/\[dev\]|Não consegui falar com a IA/)).toBeNull();
  if (screen.queryByText('Aceitar e continuar')) {
    throw new Error('CONSENTIMENTO DE TERCEIRO: especialista recebeu ação de aceite');
  }
  expect(logged).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Agora não'));
  expect(screen.queryByText('Nenhuma conversa ainda.')).toBeNull();
  fireEvent.press(screen.getByText('Nova conversa de treino'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Ver autorização'));
  (global.fetch as jest.Mock).mockResolvedValue(response({ sessions }));
  fireEvent.press(screen.getByText('Verificar autorização'));
  expect(await screen.findByText('Dieta A')).toBeTruthy();
  expect(screen.queryByText('Consentimento do aluno')).toBeNull();
  expect(
    (global.fetch as jest.Mock).mock.calls.every(([, options]) => options.method === 'GET')
  ).toBe(true);
  logged.mockRestore();
});
