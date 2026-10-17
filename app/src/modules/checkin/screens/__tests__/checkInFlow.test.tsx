import type { WeeklyReport } from '@elevapro/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CheckInCard } from '../../components/CheckInCard';
import { DailyLogReminder } from '../../components/DailyLogReminder';
import { WeeklyReportCard } from '../../components/WeeklyReportCard';
import { useWeeklyReportStore } from '../../store/weeklyReportStore';
import { CheckInResultScreen } from '../CheckInResultScreen';
import { WeeklyReportScreen } from '../WeeklyReportScreen';

const mockCan = jest.fn((_action: string, _subject: string) => true);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockApprove = jest.fn();
const mockKeep = jest.fn();
const mockUndo = jest.fn();
const mockToggle = jest.fn();
let mockSummary: unknown;
let mockProposal: unknown;
let mockReport: WeeklyReport | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));
jest.mock('@/auth', () => ({
  useCan: (action: string, subject: string) => mockCan(action, subject),
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'aluno' } }, user: { user_metadata: { full_name: 'Ana' } } }),
}));
jest.mock('../../hooks/useWeeklyCheckIn', () => ({
  useCheckInSummary: () => ({ data: mockSummary, isError: false, refetch: jest.fn() }),
  useCheckInProposal: () => ({ data: mockProposal, isError: false, refetch: jest.fn() }),
  useCheckInActions: () => ({
    approve: { mutateAsync: mockApprove, isPending: false },
    keep: { mutateAsync: mockKeep, isPending: false },
    undo: { mutateAsync: mockUndo, isPending: false },
  }),
  useDailyLogReminder: () => ({ enabled: false, toggle: { mutate: mockToggle, isPending: false } }),
}));
jest.mock('../../hooks/useWeeklyReport', () => ({
  useWeeklyReport: () => ({
    data: mockReport,
    today: '2026-10-12',
    isError: false,
    refetch: jest.fn(),
  }),
  useWeekNote: () => ({ data: null }),
}));

const CHECK_IN = {
  id: 'c1',
  week_start: '2026-10-12',
  logging: 'all',
  assessment_id: 'm1',
  status: 'pending',
  weight_origin: 'manual',
};
const PROPOSAL = {
  kind: 'proposal',
  currentCalories: 2900,
  weights: [],
  expectedWeeklyKg: -0.5,
  recalibration: {
    verdict: 'weight_above_pace',
    proposedCalories: 2750,
    deltaCalories: -150,
    expectedChangeKg: -0.5,
    actualChangeKg: 0.1,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CheckInCard (A6)', () => {
  // A5c: a semana fora do plano não fala de meta; o cartão anuncia o plano mais simples.
  it('semana fora do plano: o cartão anuncia o plano mais simples', () => {
    mockSummary = { state: 'pending', checkIn: CHECK_IN };
    mockProposal = {
      ...PROPOSAL,
      recalibration: { ...PROPOSAL.recalibration, verdict: 'low_adherence', deltaCalories: 0 },
      simplerPlan: { adherenceDays: 0, mealsPerDay: 6, nextMealsPerDay: 5 },
    };
    render(<CheckInCard />);
    expect(screen.getByText('Plano mais simples: 5 refeições')).toBeTruthy();
    expect(screen.getByText(/Você seguiu 0 de 7 dias/)).toBeTruthy();
  });

  it('semana pedindo check-in: a próxima ação', () => {
    mockSummary = { state: 'due' };
    render(<CheckInCard />);
    fireEvent.press(screen.getByText(/Começar/));
    expect(mockPush).toHaveBeenCalledWith('/checkin');
  });

  it('ajuste esperando decisão: a meta proposta', () => {
    mockSummary = { state: 'pending', checkIn: CHECK_IN };
    mockProposal = PROPOSAL;
    render(<CheckInCard />);
    expect(screen.getByText(/Meta proposta: 2\.750/)).toBeTruthy();
  });

  it('nada pendente: o cartão não aparece', () => {
    mockSummary = { state: 'none' };
    render(<CheckInCard />);
    expect(screen.queryByText(/check-in/i)).toBeNull();
  });
});

describe('CheckInResultScreen (A5)', () => {
  beforeEach(() => {
    mockSummary = { state: 'pending', checkIn: CHECK_IN };
  });

  // ADR-0020: só a aprovação muda a dieta.
  it('aprovar grava o ajuste proposto e volta ao início', async () => {
    mockProposal = PROPOSAL;
    mockApprove.mockResolvedValue({});
    render(<CheckInResultScreen />);

    fireEvent.press(screen.getByText(/Aprovar/i));

    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith({
        checkInId: 'c1',
        recalibration: PROPOSAL.recalibration,
      })
    );
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('no ritmo, só segue igual: nada é gravado como ajuste', async () => {
    mockProposal = {
      ...PROPOSAL,
      recalibration: {
        ...PROPOSAL.recalibration,
        verdict: 'on_pace',
        deltaCalories: 0,
        proposedCalories: 2900,
      },
    };
    mockKeep.mockResolvedValue({});
    render(<CheckInResultScreen />);
    fireEvent.press(screen.getByText(/Seguir igual/i));
    await waitFor(() => expect(mockKeep).toHaveBeenCalledWith('c1'));
    expect(mockApprove).not.toHaveBeenCalled();
  });

  // CASL + ADR-0030: sem a permissão de aprovar ajuste, o botão não existe.
  it('sem permissão de aprovar, só há o "seguir igual"', () => {
    mockProposal = PROPOSAL;
    mockCan.mockImplementation(
      (action, subject) => !(action === 'create' && subject === 'PlanAdjustment')
    );
    render(<CheckInResultScreen />);
    expect(screen.queryByText(/^Aprovar$/i)).toBeNull();
    mockCan.mockImplementation(() => true);
  });

  // A5c: semana fora do plano não corta calorias; o plano fica mais simples, e
  // "Aprovar" só abre o cardápio novo, que ainda espera a aprovação dele.
  it('aderência baixa propõe o plano mais simples, sem gravar ao aprovar', () => {
    mockProposal = {
      ...PROPOSAL,
      recalibration: { ...PROPOSAL.recalibration, verdict: 'low_adherence', deltaCalories: 0 },
      simplerPlan: { adherenceDays: 2, mealsPerDay: 5, nextMealsPerDay: 4 },
    };
    render(<CheckInResultScreen />);

    expect(screen.getByText('Plano mais simples')).toBeTruthy();
    expect(screen.getByText(/Você seguiu 2 de 7 dias/)).toBeTruthy();
    expect(screen.getByText('mesma meta')).toBeTruthy();
    fireEvent.press(screen.getByText(/^Aprovar$/i));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/checkin/simpler',
      params: { checkInId: 'c1' },
    });
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('o plano mais simples também deixa manter mais uma semana', async () => {
    mockProposal = {
      ...PROPOSAL,
      recalibration: { ...PROPOSAL.recalibration, verdict: 'low_adherence', deltaCalories: 0 },
      simplerPlan: { adherenceDays: 1, mealsPerDay: 4, nextMealsPerDay: 3 },
    };
    mockKeep.mockResolvedValue({});
    render(<CheckInResultScreen />);
    fireEvent.press(screen.getByText(/Manter mais uma semana/i));
    await waitFor(() => expect(mockKeep).toHaveBeenCalledWith('c1'));
  });

  it('o Aluno vê que o especialista revisa, e nada muda sozinho', () => {
    mockProposal = { kind: 'specialist', specialistName: 'Carla', lastMeasurement: null };
    render(<CheckInResultScreen />);
    expect(screen.getAllByText(/Carla/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Aprovar/i)).toBeNull();
  });
});

describe('o relatório da semana (R0, R1)', () => {
  const REPORT: WeeklyReport = {
    weekStart: '2026-10-05',
    weekEnd: '2026-10-11',
    tone: 'steady',
    workouts: { done: 3, planned: 4 },
    diet: null,
    weightChange: -0.4,
    records: [],
    adjustments: [],
    streakWeeks: 2,
  } as WeeklyReport;

  beforeEach(() => {
    mockReport = REPORT;
    useWeeklyReportStore.setState({ seenWeek: {} });
  });

  it('o cartão aparece na semana que fechou e abre o relatório', () => {
    render(<WeeklyReportCard />);
    fireEvent.press(screen.getByText(/Ver relatório/i));
    expect(mockPush).toHaveBeenCalledWith('/checkin/report');
  });

  it('abrir o relatório marca a semana como vista: o cartão sai', () => {
    render(<WeeklyReportScreen />);
    expect(useWeeklyReportStore.getState().seenWeek.aluno).toBe('2026-10-05');

    render(<WeeklyReportCard />);
    expect(screen.queryByText(/Ver relatório/i)).toBeNull();
  });
});

describe('DailyLogReminder (A5b)', () => {
  it('o lembrete das 20h liga pelo botão', () => {
    render(<DailyLogReminder />);
    fireEvent.press(screen.getByRole('switch'));
    expect(mockToggle).toHaveBeenCalled();
  });
});
