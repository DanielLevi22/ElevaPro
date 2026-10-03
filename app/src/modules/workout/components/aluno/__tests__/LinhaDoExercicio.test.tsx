import type { WorkoutExercise } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/types';
import { LinhaDoExercicio } from '../LinhaDoExercicio';

/**
 * O exercício do treino que tem Análise de Técnica leva até ela (#361): é no
 * treino que o aluno está fazendo o agachamento.
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let mockReleased = true;
jest.mock('@/shared/technique/release', () => ({
  get TECHNIQUE_RELEASED() {
    return mockReleased;
  },
}));

function exercicio(name: string): WorkoutExercise {
  return {
    id: `we-${name}`,
    workout_id: 'w1',
    exercise_id: `ex-${name}`,
    sets: 4,
    reps: '10',
    weight: null,
    rest_seconds: 60,
    order_index: 0,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    exercise: {
      id: `ex-${name}`,
      name,
      muscle_group: 'Pernas',
      venue: 'academia',
      category: 'forca',
      description: null,
      video_url: null,
      is_verified: true,
      created_by: null,
      created_at: '2026-10-01T00:00:00Z',
    },
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockReleased = true;
});

describe('LinhaDoExercicio', () => {
  it('oferece a análise no agachamento e leva até ela', () => {
    render(<LinhaDoExercicio item={exercicio('Agachamento livre')} ordem={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Analisar técnica do Agachamento livre' }));

    expect(mockPush).toHaveBeenCalledWith(ROUTES.TECHNIQUE.SQUAT);
  });

  it('não oferece a análise enquanto ela está em desenvolvimento', () => {
    mockReleased = false;
    render(<LinhaDoExercicio item={exercicio('Agachamento livre')} ordem={1} />);

    expect(screen.queryByText('Analisar técnica')).toBeNull();
  });

  it('não oferece análise no exercício que o app não sabe analisar', () => {
    render(<LinhaDoExercicio item={exercicio('Supino reto')} ordem={2} />);

    expect(screen.queryByText('Analisar técnica')).toBeNull();
  });
});
