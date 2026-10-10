import type { Exercise, WorkoutExercise } from '@elevapro/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useTodaySwapsStore } from '../../store/todaySwapsStore';
import { ExerciseSwapSheet } from '../ExerciseSwapSheet';

const mockSwapForever = jest.fn();
const mockAvoid = jest.fn();
const mockRecordSwap = jest.fn();

function exercicio(id: string, name: string): Exercise {
  return {
    id,
    name,
    muscle_group: 'Costas',
    venue: 'casa',
    category: 'forca',
    description: null,
    video_url: null,
    is_verified: true,
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
  };
}

const REMADA = exercicio('remada', 'Remada curvada');
const mockHalteres = exercicio('halteres', 'Remada com halteres');

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createExerciseSwapService: () => ({
    contextOf: async () => ({ atHome: true, avoided: [] }),
    alternativesTo: async () => [mockHalteres],
    swapForever: (...args: unknown[]) => mockSwapForever(...args),
    avoid: (...args: unknown[]) => mockAvoid(...args),
    recordSwap: (...args: unknown[]) => mockRecordSwap(...args),
  }),
}));

const ITEM = {
  id: 'item-1',
  workout_id: 'treino-1',
  exercise_id: 'remada',
  sets: 4,
  reps: '8-10',
  weight: '45',
  rest_seconds: 90,
  order_index: 0,
  notes: null,
  created_at: '2026-09-01T00:00:00Z',
  exercise: REMADA,
} as WorkoutExercise;

function abrir(selfGuided: boolean) {
  const onSwapped = jest.fn();
  render(
    <ExerciseSwapSheet
      item={ITEM}
      workoutId="treino-1"
      studentId="aluno-1"
      selfGuided={selfGuided}
      onSwapped={onSwapped}
      onClose={jest.fn()}
    />
  );
  return onSwapped;
}

beforeEach(() => {
  mockSwapForever.mockReset().mockResolvedValue(undefined);
  mockAvoid.mockReset().mockResolvedValue(undefined);
  mockRecordSwap.mockReset().mockResolvedValue(undefined);
  useTodaySwapsStore.setState({ swaps: {} });
});

describe('a folha Trocar exercício', () => {
  /**
   * TRAVA — a prescrição do especialista não é reescrita pelo aluno (#365, 6d).
   * O banco recusa de novo (`swap_workout_exercise`, 0085); a tela não oferece
   * o que o banco vai negar, nem guarda preferência de quem tem especialista.
   */
  it('o Aluno com especialista só troca no treino de hoje', async () => {
    abrir(false);
    expect(await screen.findByText('Remada com halteres')).toBeTruthy();
    if (screen.queryByText('Trocar sempre') || screen.queryByText('Recomendar menos')) {
      throw new Error('PRESCRIÇÃO EXPOSTA: o Aluno viu a troca de vez do plano do especialista');
    }
    fireEvent.press(screen.getByLabelText('Trocar por Remada com halteres'));
    await waitFor(() => expect(useTodaySwapsStore.getState().swaps['treino-1']).toBeDefined());
    expect(mockSwapForever).not.toHaveBeenCalled();
    expect(mockAvoid).not.toHaveBeenCalled();
  });

  /**
   * TRAVA — o especialista vê toda troca feita no treino que ele prescreveu
   * (0086). Troca sem registro seria o aluno mudando a prescrição sem o
   * responsável saber: sem gravar, a troca não acontece.
   */
  it('a troca do Aluno fica registrada para o especialista, e sem registro não vale', async () => {
    const onSwapped = abrir(false);
    fireEvent.press(await screen.findByLabelText('Trocar por Remada com halteres'));
    await waitFor(() => expect(mockRecordSwap).toHaveBeenCalledWith('item-1', 'halteres', 'today'));
    await waitFor(() => expect(onSwapped).toHaveBeenCalled());

    mockRecordSwap.mockRejectedValueOnce(new Error('sem conexão'));
    useTodaySwapsStore.setState({ swaps: {} });
    const semRegistro = abrir(false);
    const botoes = await screen.findAllByLabelText('Trocar por Remada com halteres');
    fireEvent.press(botoes[botoes.length - 1]);
    await waitFor(() => expect(mockRecordSwap).toHaveBeenCalledTimes(2));
    if (semRegistro.mock.calls.length > 0 || useTodaySwapsStore.getState().swaps['treino-1']) {
      throw new Error('TROCA ÀS ESCONDIDAS: o exercício mudou sem o especialista ficar sabendo');
    }
  });

  it('"só hoje" do Praticante troca a sessão e não grava nada', async () => {
    const onSwapped = abrir(true);
    fireEvent.press(await screen.findByLabelText('Trocar por Remada com halteres'));
    await waitFor(() => expect(onSwapped).toHaveBeenCalledWith(ITEM, mockHalteres));
    expect(mockSwapForever).not.toHaveBeenCalled();
    expect(mockRecordSwap).not.toHaveBeenCalled();
  });

  it('"sempre" troca no plano do Praticante', async () => {
    abrir(true);
    fireEvent.press(screen.getByText('Trocar sempre'));
    fireEvent.press(await screen.findByLabelText('Trocar por Remada com halteres'));
    await waitFor(() => expect(mockSwapForever).toHaveBeenCalledWith('item-1', 'halteres'));
    expect(mockAvoid).not.toHaveBeenCalled();
  });

  it('"recomendar menos" troca no plano e guarda o exercício para a IA evitar', async () => {
    abrir(true);
    fireEvent.press(screen.getByText('Recomendar menos'));
    fireEvent.press(await screen.findByLabelText('Trocar por Remada com halteres'));
    await waitFor(() => expect(mockAvoid).toHaveBeenCalledWith('aluno-1', 'remada'));
    expect(mockSwapForever).toHaveBeenCalledWith('item-1', 'halteres');
  });
});
