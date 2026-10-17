import { fireEvent, render, screen } from '@testing-library/react-native';
import { JourneyScreen } from '../JourneyScreen';
import { WeightTrendScreen } from '../WeightTrendScreen';

const mockTrend = jest.fn();
let mockJourney: unknown;

jest.mock('../../hooks/useJourney', () => ({
  useJourney: () => ({ data: mockJourney, isLoading: false }),
  useWeightTrend: (id: string, period: string) => mockTrend(id, period),
}));

describe('JourneyScreen (D1)', () => {
  it('os números do caminho e a linha do tempo, da mais recente', () => {
    mockJourney = {
      since: '2026-09-15',
      weeks: 4,
      weightChange: -1.5,
      records: 3,
      streakWeeks: 2,
      changes: 2,
      events: [
        {
          kind: 'target',
          date: '2026-10-08',
          title: 'Meta 3.231 → 3.081 kcal',
          sub: 'Aprovada no check-in',
        },
        { kind: 'start', date: '2026-09-15', title: 'Seu plano nasceu', sub: 'Meu primeiro plano' },
      ],
    };
    render(<JourneyScreen studentId="aluno" />);

    expect(screen.getByText('Desde 15 set · 4 semanas')).toBeTruthy();
    expect(screen.getByText('−1,5')).toBeTruthy();
    expect(screen.getByText('Seu plano nasceu')).toBeTruthy();
    expect(screen.getByText('Seu plano mudou 2 vezes com você')).toBeTruthy();
  });

  it('sem plano, explica quando a jornada começa', () => {
    mockJourney = {
      since: null,
      weeks: 0,
      weightChange: null,
      records: 0,
      streakWeeks: 0,
      changes: 0,
      events: [],
    };
    render(<JourneyScreen studentId="aluno" />);
    expect(screen.getByText(/A jornada começa no dia em que você aprova/)).toBeTruthy();
  });
});

describe('WeightTrendScreen (A10)', () => {
  it('troca a janela e mostra a última pesagem e os ajustes aprovados', () => {
    mockTrend.mockReturnValue({
      data: {
        weights: [
          { assessedAt: '2026-10-01T10:00:00Z', weightKg: 81 },
          { assessedAt: '2026-10-14T10:00:00Z', weightKg: 80.2 },
        ],
        expectedWeeklyKg: -0.3,
        adjustments: [
          {
            kind: 'calories',
            before: 3231,
            after: 3081,
            reason: 'weight_above_pace',
            at: '2026-10-08T15:00:00Z',
          },
        ],
      },
      isLoading: false,
    });
    render(<WeightTrendScreen studentId="aluno" />);

    expect(mockTrend).toHaveBeenLastCalledWith('aluno', '3m');
    expect(screen.getByText('80,2 kg')).toBeTruthy();
    expect(screen.getByText('Meta 3.231 → 3.081 kcal')).toBeTruthy();

    fireEvent.press(screen.getByText('4 semanas'));
    expect(mockTrend).toHaveBeenLastCalledWith('aluno', '4w');
  });

  it('sem pesagem na janela, pede a do check-in', () => {
    mockTrend.mockReturnValue({
      data: { weights: [], expectedWeeklyKg: null, adjustments: [] },
      isLoading: false,
    });
    render(<WeightTrendScreen studentId="aluno" />);
    expect(screen.getByText(/Nenhuma pesagem neste período/)).toBeTruthy();
  });
});
