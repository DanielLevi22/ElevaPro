import { defineAbilitiesFor, type Periodization } from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';
import { useWorkoutStore } from '../../store/workoutStore';
import { pickDate } from '../__fixtures__/datePicker';
import { answerSupabase, resetSupabaseAnswers } from '../__fixtures__/supabaseAnswers';
import PeriodizationFormScreen from '../PeriodizationFormScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock(
  '@react-native-community/datetimepicker',
  () => require('../__fixtures__/datePicker').datePickerModule
);

const CYCLE: Periodization = {
  id: 'p1',
  specialist_id: 'esp-1',
  student_id: 'aluno-1',
  student: { id: 'aluno-1', full_name: 'Ana Souza', email: 'ana@example.com' },
  name: 'Ciclo 1',
  objective: 'hypertrophy',
  status: 'planned',
  start_date: '2026-11-02',
  end_date: '2026-12-28',
  created_at: '2026-10-19T10:00:00Z',
  updated_at: '2026-10-19T10:00:00Z',
};

beforeEach(() => {
  mockReplace.mockClear();
  mockBack.mockClear();
  mockSupabase.from.mockClear();
  mockSupabaseBuilder.insert.mockClear();
  mockSupabaseBuilder.update.mockClear();
  useAuthStore.setState({
    accountType: 'specialist',
    user: { id: 'esp-1' } as Session['user'],
    abilities: defineAbilitiesFor({ accountType: 'specialist', services: ['personal_training'] }),
  });
  useWorkoutStore.setState({ periodizations: [] });
});

afterEach(resetSupabaseAnswers);

describe('criar periodização', () => {
  beforeEach(() => {
    mockParams = { studentId: 'aluno-1', studentName: 'Ana Souza' };
    answerSupabase({ 'training_periodizations:insert': { ...CYCLE, name: 'Força - Ciclo 1' } });
  });

  it('grava só a periodização, com o objetivo do web, e abre a tela dela', async () => {
    await render(<PeriodizationFormScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Ex.: Hipertrofia - Ciclo 1'),
      'Força - Ciclo 1'
    );
    await fireEvent.press(screen.getByText('Força'));
    await pickDate('Início: —', '2026-11-02');
    await pickDate('Fim: —', '2026-12-28');
    await fireEvent.press(screen.getByText('Criar periodização'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(ROUTES.WORKOUTS.PERIODIZATION('p1'))
    );
    expect(mockSupabaseBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'aluno-1',
        specialist_id: 'esp-1',
        name: 'Força - Ciclo 1',
        objective: 'strength',
        start_date: '2026-11-02',
        end_date: '2026-12-28',
        status: 'planned',
      })
    );
    expect(mockSupabase.from).not.toHaveBeenCalledWith('training_plans');
  });

  it('não grava sem as datas', async () => {
    await render(<PeriodizationFormScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hipertrofia - Ciclo 1'), 'Ciclo');
    await fireEvent.press(screen.getByText('Criar periodização'));

    await waitFor(() => expect(mockSupabaseBuilder.insert).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('editar periodização', () => {
  beforeEach(() => {
    mockParams = { periodizationId: 'p1' };
  });

  it('edita nome, objetivo e datas da periodização e volta', async () => {
    useWorkoutStore.setState({ periodizations: [CYCLE] });
    answerSupabase({ 'training_periodizations:update': { ...CYCLE, name: 'Ciclo 2' } });

    await render(<PeriodizationFormScreen />);
    await fireEvent.changeText(screen.getByDisplayValue('Ciclo 1'), 'Ciclo 2');
    await fireEvent.press(screen.getByText('Emagrecimento'));
    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockSupabaseBuilder.update).toHaveBeenCalledWith({
      name: 'Ciclo 2',
      objective: 'weight_loss',
      start_date: '2026-11-02',
      end_date: '2026-12-28',
    });
  });

  it('aberta sem a lista carregada, busca a periodização e edita em vez de criar outra', async () => {
    answerSupabase({ 'training_periodizations:select': [CYCLE] });

    await render(<PeriodizationFormScreen />);

    expect(await screen.findByDisplayValue('Ciclo 1')).toBeTruthy();
    expect(screen.getByText('Editar periodização')).toBeTruthy();
    expect(screen.queryByText('Criar periodização')).toBeNull();
  });

  it('avisa quando a periodização não existe, sem abrir o formulário de criação', async () => {
    answerSupabase({ 'training_periodizations:select': [] });

    await render(<PeriodizationFormScreen />);

    expect(await screen.findByText('Periodização não encontrada.')).toBeTruthy();
    expect(screen.queryByText('Criar periodização')).toBeNull();
  });
});
