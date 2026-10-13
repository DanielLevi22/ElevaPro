import type { OnboardingPlanPending } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AdjustSheet } from '../AdjustSheet';

const PLANO = {
  scope: 'both',
  proposal: { workouts: [], meals: [], explanation: '' },
  target: { calories: 2150, protein: 150, carbs: 220, fat: 60, guards: [] },
  mealCalories: [],
  goal: 'Hipertrofia',
  level: 'beginner',
  mealsPerDay: 4,
  sessionMinutes: 45,
  trainingDays: 3,
  caloriesByTrainingDays: { '2': 2090, '3': 2150, '4': 2230, '5': 2290, '6': 2350 },
  suggestedSwap: null,
  estimate: null,
} as OnboardingPlanPending;

describe('O10 · ajustar o plano', () => {
  it('cada opção de dias mostra a meta antes e depois, com o Δ kcal', () => {
    const onAdjust = jest.fn();
    render(
      <AdjustSheet
        visible
        plan={PLANO}
        busy={false}
        canUndo={false}
        onAdjust={onAdjust}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText('+80 kcal')).toBeTruthy();
    expect(screen.getByText('−60 kcal')).toBeTruthy();
    fireEvent.press(screen.getByText('Treinar 4 dias por semana'));
    expect(onAdjust).toHaveBeenCalledWith({ kind: 'training_days', days: 4 });
  });

  it('não oferece os dias que já estão no plano', () => {
    render(
      <AdjustSheet
        visible
        plan={PLANO}
        busy={false}
        canUndo={false}
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByText('Treinar 3 dias por semana')).toBeNull();
  });
});
