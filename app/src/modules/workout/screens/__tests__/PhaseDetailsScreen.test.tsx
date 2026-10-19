import { defineAbilitiesFor, type TrainingPlan, type Workout } from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { useAppAlertStore } from '@/components/ui/appAlert/store';
import { mockSupabaseBuilder } from '../../../../../jest.setup';
import { useWorkoutStore } from '../../store/workoutStore';
import { pickDate } from '../__fixtures__/datePicker';
import { answerSupabase, resetSupabaseAnswers } from '../__fixtures__/supabaseAnswers';
import PhaseDetailsScreen from '../PhaseDetailsScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ phaseId: 'f1' }),
}));
jest.mock(
  '@react-native-community/datetimepicker',
  () => require('../__fixtures__/datePicker').datePickerModule
);

const PHASE: TrainingPlan = {
  id: 'f1',
  periodization_id: 'p1',
  name: 'Fase 1',
  status: 'planned',
  start_date: '2026-11-02',
  end_date: '2026-12-01',
  order_index: 0,
  created_at: '2026-10-19T10:00:00Z',
};

function workoutTitled(title: string): Workout {
  return {
    id: title,
    specialist_id: 'esp-1',
    student_id: null,
    training_plan_id: 'f1',
    title,
    description: null,
    muscle_group: null,
    difficulty: null,
    day_of_week: null,
    created_at: '2026-10-19T10:00:00Z',
    updated_at: '2026-10-19T10:00:00Z',
  };
}

beforeEach(() => {
  mockSupabaseBuilder.insert.mockClear();
  mockSupabaseBuilder.update.mockClear();
  mockSupabaseBuilder.delete.mockClear();
  useAppAlertStore.setState({ current: null, queue: [] });
  useAuthStore.setState({
    accountType: 'specialist',
    user: { id: 'esp-1' } as Session['user'],
    abilities: defineAbilitiesFor({ accountType: 'specialist', services: ['personal_training'] }),
  });
  useWorkoutStore.setState({ currentPeriodizationPhases: [PHASE], workouts: [] });
});

afterEach(resetSupabaseAnswers);

it('"Novo treino" grava a ficha Treino D, com descrição e nível, na fase', async () => {
  answerSupabase({ 'workouts:select': [], 'workouts:insert': workoutTitled('Treino D') });
  await render(<PhaseDetailsScreen />);

  await fireEvent.press(screen.getByText('Novo treino'));
  await fireEvent.changeText(screen.getByPlaceholderText('Identificador (ex.: D)'), 'd');
  await fireEvent.changeText(screen.getByPlaceholderText('Descrição (opcional)'), 'Pernas');
  await fireEvent.press(screen.getByText('Avançado'));
  await fireEvent.press(screen.getByText('Criar treino'));

  await waitFor(() =>
    expect(mockSupabaseBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        training_plan_id: 'f1',
        specialist_id: 'esp-1',
        title: 'Treino D',
        description: 'Pernas',
        difficulty: 'advanced',
      })
    )
  );
});

it('mostra a divisão pelas fichas da fase', async () => {
  answerSupabase({ 'workouts:select': [workoutTitled('Treino A'), workoutTitled('Treino B')] });
  await render(<PhaseDetailsScreen />);

  expect(await screen.findByLabelText('Divisão de treino: AB')).toBeTruthy();
});

it('trocar a divisão pede confirmação, como no web, sem oferecer a IA', async () => {
  answerSupabase({ 'workouts:select': [] });
  await render(<PhaseDetailsScreen />);

  await fireEvent.press(screen.getByLabelText('Divisão de treino: nenhuma'));
  await fireEvent.press(screen.getByText('ABC'));

  const confirmation = useAppAlertStore.getState().current;
  expect(confirmation).toMatchObject({ kind: 'confirm', title: 'Alterar divisão de treino?' });
  expect(screen.queryByText('Usar Co-Pilot')).toBeNull();
});

it('a data de término da fase se edita na própria tela', async () => {
  answerSupabase({ 'workouts:select': [], 'training_plans:update': PHASE });
  await render(<PhaseDetailsScreen />);

  await pickDate('Término: 01/12/2026', '2026-12-15');

  await waitFor(() =>
    expect(mockSupabaseBuilder.update).toHaveBeenCalledWith({ end_date: '2026-12-15' })
  );
});

it('a fase se renomeia pelo nome no cabeçalho', async () => {
  answerSupabase({ 'workouts:select': [], 'training_plans:update': PHASE });
  await render(<PhaseDetailsScreen />);

  await fireEvent.press(screen.getByLabelText('Renomear fase Fase 1'));
  await fireEvent.changeText(screen.getByDisplayValue('Fase 1'), 'Semanas 1–4 · Adaptação');
  await fireEvent.press(screen.getByText('Salvar nome'));

  expect(await screen.findByLabelText('Renomear fase Semanas 1–4 · Adaptação')).toBeTruthy();
});
