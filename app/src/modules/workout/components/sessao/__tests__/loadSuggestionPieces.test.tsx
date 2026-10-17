import type { WorkoutExercise } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EffortPrompt } from '../EffortPrompt';
import { NextTimeLoads, TodayLoads } from '../LoadSuggestionList';

const item = (id: string, name: string) =>
  ({ id, exercise: { name } }) as unknown as WorkoutExercise;
const ITEMS = [item('e1', 'Supino'), item('e2', 'Remada'), item('e3', 'Rosca')];

describe('TodayLoads (A1)', () => {
  it('mostra a carga sugerida de quem tem histórico, com o porquê', () => {
    render(
      <TodayLoads
        items={ITEMS}
        suggestions={{
          e1: { kind: 'increase', weightKg: 47.5, deltaKg: 2.5, reason: 'easy' },
          e2: { kind: 'keep', weightKg: null, reason: 'no_history' },
        }}
      />
    );
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Carga sugerida')).toBeTruthy();
    // Sem histórico, a prescrição já basta: o exercício nem aparece.
    expect(screen.queryByText('Remada')).toBeNull();
  });

  it('sem nada a dizer, a seção some', () => {
    render(<TodayLoads items={ITEMS} suggestions={{}} />);
    expect(screen.queryByText('Cargas de hoje')).toBeNull();
  });
});

describe('NextTimeLoads (A3)', () => {
  it('só os exercícios feitos hoje', () => {
    render(
      <NextTimeLoads
        items={ITEMS}
        suggestions={{ e3: { kind: 'decrease', weightKg: 10, deltaKg: 2, reason: 'hard_twice' } }}
      />
    );
    expect(screen.getByText('Na próxima vez')).toBeTruthy();
    expect(screen.getByText('Rosca')).toBeTruthy();
    expect(screen.queryByText('Supino')).toBeNull();
  });
});

describe('EffortPrompt (A2)', () => {
  it('a resposta vira o esforço do exercício, e pular manda nulo', () => {
    const onAnswer = jest.fn();
    render(<EffortPrompt name="Supino" aboveButton={false} onAnswer={onAnswer} />);

    expect(screen.getByText('Como foi Supino?')).toBeTruthy();
    fireEvent.press(screen.getByText('Difícil'));
    fireEvent.press(screen.getByText('Pular'));

    expect(onAnswer.mock.calls).toEqual([['hard'], [null]]);
  });
});
