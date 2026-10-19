import { defineAbilitiesFor, type Periodization } from '@elevapro/shared';
import type { Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';
import { useWorkoutStore } from '../../store/workoutStore';
import { answerSupabase, resetSupabaseAnswers } from '../__fixtures__/supabaseAnswers';
import PeriodizationFormScreen from '../PeriodizationFormScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

// O calendário nativo, trocado por um botão que escolhe a data da vez.
let mockNextDate = '';
jest.mock('@react-native-community/datetimepicker', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ onChange }: { onChange: (event: object, date: Date) => void }) => (
    <Text onPress={() => onChange({}, new Date(`${mockNextDate}T12:00:00`))}>Confirmar data</Text>
  );
});

const CICLO: Periodization = {
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

function pickDate(label: string, date: string) {
  mockNextDate = date;
  fireEvent.press(screen.getByLabelText(label));
  fireEvent.press(screen.getByText('Confirmar data'));
}

describe('criar periodização', () => {
  beforeEach(() => {
    mockParams = { studentId: 'aluno-1', studentName: 'Ana Souza' };
    answerSupabase({ 'training_periodizations:insert': { ...CICLO, name: 'Força - Ciclo 1' } });
  });

  it('grava só a periodização, com o objetivo do web, e abre a tela dela', async () => {
    render(<PeriodizationFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('Ex.: Hipertrofia - Ciclo 1'),
      'Força - Ciclo 1'
    );
    fireEvent.press(screen.getByText('Força'));
    pickDate('Início: —', '2026-11-02');
    pickDate('Fim: —', '2026-12-28');
    fireEvent.press(screen.getByText('Criar periodização'));

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
    render(<PeriodizationFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hipertrofia - Ciclo 1'), 'Ciclo');
    fireEvent.press(screen.getByText('Criar periodização'));

    await waitFor(() => expect(mockSupabaseBuilder.insert).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

it('edita nome, objetivo e datas da periodização e volta', async () => {
  mockParams = { periodizationId: 'p1' };
  useWorkoutStore.setState({ periodizations: [CICLO] });
  answerSupabase({ 'training_periodizations:update': { ...CICLO, name: 'Ciclo 2' } });

  render(<PeriodizationFormScreen />);
  expect(screen.getByDisplayValue('Ciclo 1')).toBeTruthy();
  fireEvent.changeText(screen.getByDisplayValue('Ciclo 1'), 'Ciclo 2');
  fireEvent.press(screen.getByText('Emagrecimento'));
  fireEvent.press(screen.getByText('Salvar'));

  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockSupabaseBuilder.update).toHaveBeenCalledWith({
    name: 'Ciclo 2',
    objective: 'weight_loss',
    start_date: '2026-11-02',
    end_date: '2026-12-28',
  });
});
