import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BlockCard } from '../../components/BlockCard';
import { useBlockStore } from '../../store/blockStore';
import { useReviewStore } from '../../store/reviewStore';
import { BuildingScreen } from '../BuildingScreen';
import { ChangesScreen } from '../ChangesScreen';
import { MeasuresScreen } from '../MeasuresScreen';
import { NextBlockScreen } from '../NextBlockScreen';
import { ReviewScreen } from '../ReviewScreen';

const mockCan = jest.fn((_action: string, _subject: string) => true);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDeclare = jest.fn();
const mockBuild = jest.fn();
const mockApprove = jest.fn();
let mockBlock: unknown = null;
let mockRests: unknown[] = [];
let mockLevelUp = false;
let mockStalled: string | null = null;

// O passo animado usa o movimento reduzido, que o mock do Reanimated não tem.
jest.mock('@/components/ui/WaitStep', () => {
  const { Text } = require('react-native');
  return { WaitStep: ({ label }: { label: string }) => <Text>{label}</Text> };
});
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));
jest.mock('@/auth', () => ({
  useCan: (action: string, subject: string) => mockCan(action, subject),
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'aluno' } } }),
}));
jest.mock('@/hooks/useActiveBlock', () => ({ useActiveBlock: () => mockBlock }));
jest.mock('@/hooks/useRestPeriods', () => ({
  useRestPeriods: () => mockRests,
  useRestActions: () => ({ end: { mutateAsync: jest.fn(), isPending: false } }),
}));
jest.mock('@/services/healthSync', () => ({ localDateKey: () => '2026-10-29' }));
jest.mock('../../hooks/useBlockReview', () => ({
  useBlockChoices: () => ({
    data: { goal: 'Hipertrofia', trainingDays: 4, place: 'Academia completa', injuries: [] },
  }),
  useLevelUpAvailable: () => ({ data: mockLevelUp }),
  useStalledWeek: () => ({ data: mockStalled }),
  useLatestDeclaredMeasure: () => ({ data: { weight_kg: 80, circ_waist: 84, height_cm: 178 } }),
  useDeclareMeasure: () => ({ mutateAsync: mockDeclare, isPending: false }),
  useNextBlockActions: () => ({
    build: { mutate: mockBuild, isPending: true, isError: false },
    approve: { mutateAsync: mockApprove, isPending: false },
  }),
}));

const BLOCK = {
  id: 'bloco-2',
  name: 'Bloco 2 · Hipertrofia',
  start_date: '2026-10-01',
  end_date: '2026-10-28',
  planIds: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  useReviewStore.getState().reset();
  useBlockStore.setState({
    deloadSeen: [],
    reviewSnoozedUntil: {},
    returnSeen: [],
    stallSeen: null,
  });
  mockBlock = BLOCK;
  mockRests = [];
  mockLevelUp = false;
  mockStalled = null;
});

describe('ReviewScreen (B1)', () => {
  it('"Começar" abre a medida com a reavaliação limpa', () => {
    useReviewStore.getState().setChanges({ training_days: 2 });
    render(<ReviewScreen />);
    fireEvent.press(screen.getByText(/Começar/));
    expect(useReviewStore.getState().changes).toEqual({});
    expect(mockPush).toHaveBeenCalledWith('/block/measures');
  });

  it('"Lembrar amanhã" adia o cartão deste bloco até amanhã', () => {
    render(<ReviewScreen />);
    fireEvent.press(screen.getByText('Lembrar amanhã'));
    expect(useBlockStore.getState().reviewSnoozedUntil['bloco-2']).toBe('2026-10-30');
  });
});

describe('MeasuresScreen (B1)', () => {
  it('parte da última medida e grava com a altura dela', async () => {
    mockDeclare.mockResolvedValue({});
    render(<MeasuresScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('80')).toBeTruthy());

    fireEvent.changeText(screen.getByDisplayValue('80'), '78,5');
    fireEvent.press(screen.getByText(/Continuar/i));

    await waitFor(() =>
      expect(mockDeclare).toHaveBeenCalledWith({ weight_kg: 78.5, circ_waist: 84, height_cm: 178 })
    );
    expect(mockPush).toHaveBeenCalledWith('/block/changes');
  });

  it('peso fora da faixa não grava', async () => {
    render(<MeasuresScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('80')).toBeTruthy());
    fireEvent.changeText(screen.getByDisplayValue('80'), '7');
    fireEvent.press(screen.getByText(/^continuar$/i));
    expect(mockDeclare).not.toHaveBeenCalled();
  });
});

describe('ChangesScreen (B2)', () => {
  it('quem não toca em nada segue igual: o próximo bloco não recebe mudança', () => {
    render(<ChangesScreen />);
    expect(screen.getByText('Hoje: 4 dias')).toBeTruthy();
    fireEvent.press(screen.getByText(/Montar|Continuar|Próximo/i));
    expect(useReviewStore.getState().changes).toEqual({});
    expect(mockPush).toHaveBeenCalledWith('/block/building');
  });

  it('vinda de "Mudar meu plano", a pergunta escolhida abre como Mudou e segue antes do fim', async () => {
    useReviewStore.getState().startEarly('gym_type');
    render(<ChangesScreen />);
    fireEvent.press(await screen.findByText('Casa'));
    fireEvent.press(screen.getByText(/Montar|Continuar|Próximo/i));

    expect(useReviewStore.getState().changes).toEqual({ gym_type: 'Home gym' });
    expect(mockPush).toHaveBeenCalledWith('/block/early');
  });

  // #376: pelo peso parado, a estagnação já é o motivo; nada precisa mudar.
  it('na reavaliação pela estagnação, segue antes do fim sem mudança', () => {
    useReviewStore.getState().startStalledReview();
    render(<ChangesScreen />);
    fireEvent.press(screen.getByText(/Continuar/i));
    expect(mockPush).toHaveBeenCalledWith('/block/early');
  });

  it('subir de nível só aparece para quem pode, e é a pessoa que diz sim', () => {
    render(<ChangesScreen />);
    expect(screen.queryByText('Quer passar para intermediário?')).toBeNull();
  });
});

describe('BuildingScreen (B3)', () => {
  // Cada pedido é uma geração de IA paga: uma por abertura.
  it('pede o próximo bloco uma vez, com o que mudou', () => {
    useReviewStore.getState().setChanges({ training_days: 3 });
    const { rerender } = render(<BuildingScreen />);
    rerender(<BuildingScreen />);
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockBuild.mock.calls[0][0]).toEqual({ changes: { training_days: 3 }, early: false });
  });
});

describe('NextBlockScreen (B5)', () => {
  const pending = {
    blockNumber: 3,
    early: true,
    comparison: {
      trainingDays: { before: 4, after: 3 },
      newExercises: ['Remada baixa'],
      keptExercises: 5,
      calories: { before: 2900, after: 2750 },
      level: null,
    },
  };

  it('sem proposta esperando, não aprova nada', () => {
    render(<NextBlockScreen />);
    expect(screen.getByText('Nenhum bloco esperando')).toBeTruthy();
  });

  it('antes do fim, o bloco novo começa amanhã; aprovar limpa a reavaliação', async () => {
    useReviewStore.getState().setPending(pending as never);
    mockApprove.mockResolvedValue({});
    render(<NextBlockScreen />);

    expect(screen.getByText(/Começa amanhã/)).toBeTruthy();
    fireEvent.press(screen.getByText(/Aprovar Bloco 3/i));

    await waitFor(() => expect(mockApprove).toHaveBeenCalled());
    expect(useReviewStore.getState().pending).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('BlockCard (A7, B1)', () => {
  it('no fim do bloco, chama para a reavaliação', () => {
    render(<BlockCard />);
    expect(screen.getByText('Hora da reavaliação')).toBeTruthy();
  });

  it('em Modo Descanso, a pausa vem antes do bloco', () => {
    mockRests = [{ id: 'r', starts_on: '2026-10-27', planned_until: null, ended_on: null }];
    render(<BlockCard />);
    expect(screen.queryByText('Hora da reavaliação')).toBeNull();
    expect(screen.getByText('Sem data para voltar')).toBeTruthy();
  });

  describe('no meio do bloco, com o peso parado há 3 semanas', () => {
    beforeEach(() => {
      mockBlock = { ...BLOCK, start_date: '2026-10-20', end_date: '2026-11-16' };
      mockStalled = '2026-10-26';
    });

    it('oferece reavaliar agora, sem mudança escolhida', () => {
      render(<BlockCard />);
      fireEvent.press(screen.getByText('Reavaliar agora'));
      expect(useReviewStore.getState()).toMatchObject({ early: true, stalled: true, focus: null });
      expect(mockPush).toHaveBeenCalledWith('/block/changes');
    });

    // Nunca cobrar: "Agora não" tira o cartão até um check-in novo mudar o quadro.
    it('"Agora não" guarda a semana e o cartão some', () => {
      render(<BlockCard />);
      fireEvent.press(screen.getByText('Agora não'));
      expect(useBlockStore.getState().stallSeen).toBe('2026-10-26');
    });
  });

  it('sem bloco próprio (o Aluno), não aparece', () => {
    mockBlock = null;
    render(<BlockCard />);
    expect(screen.queryByText('Hora da reavaliação')).toBeNull();
  });
});
