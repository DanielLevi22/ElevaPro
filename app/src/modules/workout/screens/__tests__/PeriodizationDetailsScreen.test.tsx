import {
  addDays,
  defineAbilitiesFor,
  localDateOf,
  type Periodization,
  type TrainingPlan,
} from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { useAppAlertStore } from '@/components/ui/appAlert/store';
import { ROUTES } from '@/navigation/types';
import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';
import { useWorkoutStore } from '../../store/workoutStore';
import { answerSupabase, resetSupabaseAnswers } from '../__fixtures__/supabaseAnswers';
import PeriodizationDetailsScreen from '../PeriodizationDetailsScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p1' }),
}));

const CYCLE: Periodization = {
  id: 'p1',
  specialist_id: 'esp-1',
  student_id: 'aluno-1',
  name: 'Ciclo 1',
  objective: 'strength',
  status: 'planned',
  start_date: '2026-11-02',
  end_date: '2026-12-28',
  created_at: '2026-10-19T10:00:00Z',
  updated_at: '2026-10-19T10:00:00Z',
};

const PHASE: TrainingPlan = {
  id: 'f1',
  periodization_id: 'p1',
  name: 'Fase 1',
  status: 'planned',
  start_date: '2026-10-19',
  end_date: '2026-11-18',
  order_index: 0,
  created_at: '2026-10-19T10:00:00Z',
};

beforeEach(() => {
  mockPush.mockClear();
  mockSupabaseBuilder.insert.mockClear();
  mockSupabaseBuilder.update.mockClear();
  useAppAlertStore.setState({ current: null, queue: [] });
  useAuthStore.setState({
    accountType: 'specialist',
    user: { id: 'esp-1' } as Session['user'],
    abilities: defineAbilitiesFor({ accountType: 'specialist', services: ['personal_training'] }),
  });
  useWorkoutStore.setState({ periodizations: [CYCLE], currentPeriodizationPhases: [] });
  answerSupabase({ 'training_plans:select': [], 'training_plans:insert': PHASE });
});

afterEach(resetSupabaseAnswers);

it('sem fases, orienta a criar a primeira e mostra o objetivo pelo rótulo do web', async () => {
  render(<PeriodizationDetailsScreen />);

  expect(await screen.findByText('Adicione a primeira fase')).toBeTruthy();
  expect(screen.getByText('Força')).toBeTruthy();
});

it('"Nova fase" grava a Fase 1 com 30 dias e a mostra na lista, sem sair da tela', async () => {
  render(<PeriodizationDetailsScreen />);
  fireEvent.press(await screen.findByText('Nova fase'));

  expect(await screen.findByText('Fase 1')).toBeTruthy();
  const today = localDateOf(new Date());
  // A tela mostra o nome; datas e ordem só existem no que foi gravado.
  expect(mockSupabaseBuilder.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      periodization_id: 'p1',
      start_date: today,
      end_date: addDays(today, 30),
      order_index: 0,
      status: 'planned',
    })
  );
  expect(screen.queryByText('Adicione a primeira fase')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

it('"Editar" abre o formulário da periodização', async () => {
  render(<PeriodizationDetailsScreen />);
  fireEvent.press(await screen.findByLabelText('Editar'));

  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith(ROUTES.WORKOUTS.PERIODIZATION_EDIT('p1'))
  );
});

it('"Ativar" ativa a periodização, conclui a outra ativa do aluno e não toca nas fases', async () => {
  const previous: Periodization = { ...CYCLE, id: 'p0', name: 'Ciclo 0', status: 'active' };
  useWorkoutStore.setState({
    periodizations: [CYCLE, previous],
    currentPeriodizationPhases: [PHASE],
  });
  answerSupabase({
    'training_plans:select': [PHASE],
    'training_periodizations:select': { student_id: 'aluno-1' },
    'training_periodizations:update': { ...CYCLE, status: 'active' },
  });
  render(<PeriodizationDetailsScreen />);
  fireEvent.press(await screen.findByText('Ativar periodização'));
  mockSupabase.from.mockClear();

  const confirmation = useAppAlertStore.getState().current;
  if (confirmation?.kind !== 'confirm') throw new Error(`Esperado confirm, veio ${confirmation}`);
  await act(async () => confirmation.onConfirm());

  expect(await screen.findByText('Encerrar periodização')).toBeTruthy();
  // As outras ativas do aluno e as fases não aparecem nesta tela: só o banco diz.
  expect(mockSupabaseBuilder.update).toHaveBeenCalledWith({ status: 'completed' });
  expect(mockSupabaseBuilder.update).toHaveBeenCalledWith({ status: 'active' });
  expect(mockSupabase.from).not.toHaveBeenCalledWith('training_plans');
});
