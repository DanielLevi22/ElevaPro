import type { BlockReport } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useBlockStore } from '../../store/blockStore';
import { useReviewStore } from '../../store/reviewStore';
import { BlockReportScreen } from '../BlockReportScreen';
import { DeloadScreen } from '../DeloadScreen';
import { EarlyChangeScreen } from '../EarlyChangeScreen';
import { ReturnScreen } from '../ReturnScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockReport: BlockReport | undefined;
let mockPast: unknown;
let mockRests: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));
jest.mock('@/auth', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'aluno' } } }),
}));
jest.mock('@/hooks/useActiveBlock', () => ({
  useActiveBlock: (id: string | null) =>
    id
      ? {
          id: 'bloco-2',
          name: 'Bloco 2 · Força',
          start_date: '2026-10-01',
          end_date: '2026-10-28',
          planIds: [],
        }
      : null,
}));
jest.mock('@/hooks/useRestPeriods', () => ({ useRestPeriods: () => mockRests }));
jest.mock('@/services/healthSync', () => ({ localDateKey: () => '2026-10-14' }));
jest.mock('../../hooks/useBlockReview', () => ({
  useBlockReport: () => ({ data: mockReport }),
  useBlockById: () => ({ data: mockPast }),
}));

const REPORT: BlockReport = {
  start: '2026-10-01',
  end: '2026-10-28',
  verdict: 'on_track',
  promisedKg: null,
  realKg: null,
  weight: { before: 82, after: 80.5 },
  waist: null,
  workouts: { done: 14, planned: 16 },
  records: 3,
  diet: null,
  streakWeeks: 4,
  changes: { loads: 0, swaps: 1, targets: 2 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReport = REPORT;
  mockPast = undefined;
  mockRests = [];
  useBlockStore.setState({ deloadSeen: [], reviewSnoozedUntil: {}, returnSeen: [] });
  useReviewStore.getState().reset();
});

describe('DeloadScreen (A7)', () => {
  it('abrir marca a descarga como vista: o cartão do início sai', () => {
    render(<DeloadScreen />);
    expect(screen.getByText('Semana 4: descarga')).toBeTruthy();
    expect(useBlockStore.getState().deloadSeen).toEqual(['bloco-2']);
  });
});

describe('ReturnScreen (A8 Volta)', () => {
  it('a volta de uma pausa longa fica marcada como vista ao abrir', () => {
    mockRests = [
      { id: 'pausa-1', starts_on: '2026-09-28', planned_until: null, ended_on: '2026-10-12' },
    ];
    render(<ReturnScreen />);
    expect(screen.getByText('Bem-vindo de volta')).toBeTruthy();
    expect(useBlockStore.getState().returnSeen).toEqual(['pausa-1']);
  });
});

describe('EarlyChangeScreen (C2)', () => {
  it('diz o que fica e quando o novo começa, e só segue pelo "Gerar plano novo"', () => {
    useReviewStore.getState().startEarly('gym_type');
    useReviewStore.getState().setChanges({ gym_type: 'Home gym' });
    render(<EarlyChangeScreen />);

    expect(screen.getByText('O Bloco 2 termina hoje')).toBeTruthy();
    expect(screen.getByText('2 semanas, 14 treinos e 3 recordes')).toBeTruthy();
    expect(screen.getByText('O próximo bloco começa amanhã')).toBeTruthy();
    fireEvent.press(screen.getByText(/Gerar plano novo/i));
    expect(mockPush).toHaveBeenCalledWith('/block/building');
  });
});

describe('BlockReportScreen (B4, C3)', () => {
  it('no fim do bloco, mostra o antes e depois e segue para o próximo', () => {
    useReviewStore.getState().setPending({ blockNumber: 3 } as never);
    render(<BlockReportScreen />);

    expect(screen.getByText('Antes e depois')).toBeTruthy();
    fireEvent.press(screen.getByText(/Ver o Bloco 3/i));
    expect(mockReplace).toHaveBeenCalledWith('/block/next');
  });

  it('pelo histórico, é o relatório de um bloco antigo, e o botão volta', () => {
    mockPast = {
      id: 'bloco-1',
      name: 'Bloco 1',
      start_date: '2026-09-01',
      end_date: '2026-09-28',
      end_reason: 'block_completed',
    };
    render(<BlockReportScreen blockId="bloco-1" />);
    fireEvent.press(screen.getByText(/Voltar/i));
    expect(mockBack).toHaveBeenCalled();
  });

  it('enquanto os números chegam, avisa que está juntando', () => {
    mockReport = undefined;
    render(<BlockReportScreen />);
    expect(screen.getByText('Juntando os números do bloco…')).toBeTruthy();
  });
});
