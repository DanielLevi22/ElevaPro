import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ChangePlanButton } from '../../components/ChangePlanButton';
import { RestCard } from '../../components/RestCard';
import { useReviewStore } from '../../store/reviewStore';
import { RestModeScreen } from '../RestModeScreen';

const mockCan = jest.fn((_action: string, _subject: string) => true);
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockStart = jest.fn();
const mockEnd = jest.fn();
let mockBlock: unknown = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
}));
jest.mock('@/hooks/useRestPeriods', () => ({
  useRestActions: () => ({
    start: { mutateAsync: mockStart, isPending: false },
    end: { mutateAsync: mockEnd, isPending: false },
  }),
}));
jest.mock('@/hooks/useActiveBlock', () => ({ useActiveBlock: () => mockBlock }));
jest.mock('@/auth', () => ({
  useCan: (action: string, subject: string) => mockCan(action, subject),
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'aluno' } } }),
}));
jest.mock('@/services/healthSync', () => ({ localDateKey: () => '2026-10-14' }));

describe('RestModeScreen (A8)', () => {
  beforeEach(() => jest.clearAllMocks());

  // Art. 6°, III: "estou doente" e "estou machucada" são dado de saúde que a
  // pausa não precisa. O motivo só muda o texto da tela; ao servidor vai a data.
  it('pausa até a data escolhida, e o motivo não sai do aparelho', async () => {
    mockStart.mockResolvedValue({});
    await render(<RestModeScreen />);

    await fireEvent.press(screen.getByText('Estou doente'));
    await fireEvent.press(screen.getByText('14 dias'));
    await fireEvent.press(screen.getByText(/Pausar plano/i));

    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    const sent = JSON.stringify(mockStart.mock.calls[0]);
    if (/doente|sick|machuc|hurt/i.test(sent)) {
      throw new Error(`MOTIVO GRAVADO: a pausa mandou ${sent}`);
    }
    expect(mockStart).toHaveBeenCalledWith('2026-10-27');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('"Não sei" pausa sem data de volta', async () => {
    mockStart.mockResolvedValue({});
    await render(<RestModeScreen />);
    await fireEvent.press(screen.getByText('Viagem ou rotina corrida'));
    await fireEvent.press(screen.getByText('Não sei'));
    await fireEvent.press(screen.getByText(/Pausar plano/i));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith(null));
  });

  it('sem o motivo, o botão espera', async () => {
    await render(<RestModeScreen />);
    await fireEvent.press(screen.getByText(/Pausar plano/i));
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe('RestCard', () => {
  beforeEach(() => jest.clearAllMocks());
  const rest = { id: 'r', starts_on: '2026-10-10', planned_until: '2026-10-21', ended_on: null };

  it('em pausa: diz até quando e volta pelo botão', async () => {
    mockEnd.mockResolvedValue({});
    await render(<RestCard state={{ kind: 'resting', rest }} />);
    expect(screen.getByText('Até 21 out')).toBeTruthy();
    await fireEvent.press(screen.getByText('Voltar agora'));
    await waitFor(() => expect(mockEnd).toHaveBeenCalled());
  });

  it('sem permissão de encerrar a pausa, o botão de voltar não aparece', async () => {
    mockCan.mockImplementation(() => false);
    await render(<RestCard state={{ kind: 'resting', rest }} />);
    expect(screen.queryByText('Voltar agora')).toBeNull();
    mockCan.mockImplementation(() => true);
  });

  it('na semana de retorno: abre as boas-vindas', async () => {
    await render(
      <RestCard state={{ kind: 'return', rest: { ...rest, ended_on: '2026-10-13' } }} />
    );
    await fireEvent.press(screen.getByText('Ver a semana'));
    expect(mockPush).toHaveBeenCalledWith('/block/return');
  });
});

describe('ChangePlanButton (C1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useReviewStore.getState().reset();
  });

  it('sem bloco próprio, não aparece: o Aluno muda o plano com o especialista', async () => {
    mockBlock = null;
    await render(<ChangePlanButton />);
    expect(screen.queryByLabelText('Mudar meu plano')).toBeNull();
  });

  it('o motivo escolhido abre a reavaliação antecipada, já na pergunta certa', async () => {
    mockBlock = {
      id: 'b',
      name: 'Bloco 2 · Força',
      start_date: '2026-10-01',
      end_date: '2026-10-28',
      planIds: [],
    };
    await render(<ChangePlanButton />);

    await fireEvent.press(screen.getByLabelText('Mudar meu plano'));
    expect(screen.getByText('Você está na semana 2 de 4 do Bloco 2.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Vou treinar em outro lugar'));

    expect(useReviewStore.getState()).toMatchObject({ early: true, focus: 'gym_type' });
    expect(mockPush).toHaveBeenCalledWith('/block/changes');
  });

  it('"Preciso de uma pausa" leva ao Modo Descanso', async () => {
    mockBlock = {
      id: 'b',
      name: 'Bloco 2',
      start_date: '2026-10-01',
      end_date: '2026-10-28',
      planIds: [],
    };
    await render(<ChangePlanButton />);
    await fireEvent.press(screen.getByLabelText('Mudar meu plano'));
    await fireEvent.press(screen.getByText('Preciso de uma pausa'));
    expect(mockPush).toHaveBeenCalledWith('/block/rest');
  });
});
