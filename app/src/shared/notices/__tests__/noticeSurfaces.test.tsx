import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { IgnoredNoticePrompt } from '../IgnoredNoticePrompt';
import { useNoticeChoicesStore } from '../noticeChoicesStore';
import { useNoticePreferencesStore } from '../noticePreferencesStore';
import { TodayChecklistCard } from '../TodayChecklistCard';
import type { ChecklistItem } from '../useTodayChecklist';

const mockPush = jest.fn();
const mockHandle = jest.fn();
let mockItems: ChecklistItem[] = [];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('../useTodayChecklist', () => ({
  TODAY_CHECKLIST_KEY: 'today-checklist',
  useTodayChecklist: () => ({ data: mockItems }),
}));
jest.mock('../noticeActions', () => ({
  handleNoticeAction: (...args: unknown[]) => mockHandle(...args),
}));
jest.mock('../../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('TodayChecklistCard (E4)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('o que ficou para trás, com o botão de fazer, e o que já foi feito', async () => {
    mockItems = [
      { kind: 'workout', id: 'b', name: 'Treino B', time: null, done: false },
      { kind: 'meal', id: 'cafe', name: 'Café', time: '07:00', done: true },
      { kind: 'meal', id: 'almoco', name: 'Almoço', time: '12:00', done: false },
    ];
    render(<TodayChecklistCard studentId="aluno" />, { wrapper: wrap });

    expect(screen.getByText('Falta hoje')).toBeTruthy();
    expect(screen.getByText('Feito hoje: Café')).toBeTruthy();

    fireEvent.press(screen.getByText('Marcar'));
    await waitFor(() =>
      expect(mockHandle).toHaveBeenCalledWith(
        'aluno',
        'meal-done',
        expect.objectContaining({ noticeKind: 'meal', refId: 'almoco' })
      )
    );

    fireEvent.press(screen.getByText('20 min'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/workouts/execute/[id]',
      params: { id: 'b', short: '1' },
    });
    fireEvent.press(screen.getByText('Começar'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/workouts/execute/b');
  });

  it('com tudo feito, o cartão some', () => {
    mockItems = [{ kind: 'meal', id: 'cafe', name: 'Café', time: '07:00', done: true }];
    render(<TodayChecklistCard studentId="aluno" />, { wrapper: wrap });
    expect(screen.queryByText('Falta hoje')).toBeNull();
  });
});

describe('IgnoredNoticePrompt (E6)', () => {
  beforeEach(() => {
    useNoticeChoicesStore.getState().reset();
    useNoticePreferencesStore.getState().update({ workout: true });
  });

  it('não pergunta antes de três avisos ignorados', () => {
    useNoticeChoicesStore.setState({ ignored: { 'meal:almoco': { count: 2, label: 'Almoço' } } });
    render(<IgnoredNoticePrompt />);
    expect(screen.queryByText('Mudar o aviso do almoço?')).toBeNull();
  });

  it('no terceiro, pergunta; "uma hora mais tarde" empurra o aviso da refeição', () => {
    useNoticeChoicesStore.setState({ ignored: { 'meal:almoco': { count: 3, label: 'Almoço' } } });
    render(<IgnoredNoticePrompt />);

    fireEvent.press(screen.getByText('Uma hora mais tarde'));

    expect(useNoticeChoicesStore.getState().mealDelays).toEqual({ almoco: 60 });
    expect(screen.queryByText('Mudar o aviso do almoço?')).toBeNull();
  });

  it('parar o aviso de treino desliga o tipo em Avisos', () => {
    useNoticeChoicesStore.setState({ ignored: { 'workout:b': { count: 3, label: 'treino' } } });
    render(<IgnoredNoticePrompt />);

    fireEvent.press(screen.getByText('Parar este aviso'));

    expect(useNoticePreferencesStore.getState().workout).toBe(false);
  });

  it('"deixar como está" zera a conta sem mudar nada', () => {
    useNoticeChoicesStore.setState({ ignored: { 'meal:jantar': { count: 4, label: 'Jantar' } } });
    render(<IgnoredNoticePrompt />);

    fireEvent.press(screen.getByText('Deixar como está'));

    expect(useNoticeChoicesStore.getState().ignored['meal:jantar']).toBeUndefined();
    expect(useNoticeChoicesStore.getState().mutedMeals).toEqual([]);
  });
});
