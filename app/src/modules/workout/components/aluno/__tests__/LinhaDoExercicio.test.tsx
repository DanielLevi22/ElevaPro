import type { WorkoutExercise } from '@elevapro/shared';
import { simplePrescriptionToSetPlan } from '@elevapro/shared';
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
    set_plan: simplePrescriptionToSetPlan({ sets: 4, reps: '10', weight: null, rest_seconds: 60 })
      .plan,
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
  it('oferece a análise no agachamento e leva até ela', async () => {
    await render(<LinhaDoExercicio item={exercicio('Agachamento livre')} ordem={1} />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Analisar técnica do Agachamento livre' })
    );

    expect(mockPush).toHaveBeenCalledWith(ROUTES.TECHNIQUE.SQUAT);
  });

  it('não oferece a análise enquanto ela está em desenvolvimento', async () => {
    mockReleased = false;
    await render(<LinhaDoExercicio item={exercicio('Agachamento livre')} ordem={1} />);

    expect(screen.queryByText('Analisar técnica')).toBeNull();
  });

  it('não oferece análise no exercício que o app não sabe analisar', async () => {
    await render(<LinhaDoExercicio item={exercicio('Supino reto')} ordem={2} />);

    expect(screen.queryByText('Analisar técnica')).toBeNull();
  });

  // O aluno precisa saber antes de começar que a série tem rest-pause (#431).
  it('mostra as técnicas do plano, das séries e dos blocos, sem "Normal"', async () => {
    const base = exercicio('Supino reto');
    const [primeira, ...resto] = base.set_plan;
    if (!primeira) throw new Error('o exercício de teste precisa de série');
    const comTecnicas = {
      ...base,
      set_plan: [
        { ...primeira, methods: ['rest_pause'] },
        {
          ...primeira,
          segments: [
            {
              reps: { mode: 'failure' as const },
              weight_kg: null,
              pause_seconds: 0,
              methods: ['partial'],
            },
          ],
        },
        ...resto,
      ],
    };
    await render(<LinhaDoExercicio item={comTecnicas} ordem={1} />);

    expect(screen.getByText('Rest-pause')).toBeTruthy();
    expect(screen.getByText('Parcial')).toBeTruthy();
    expect(screen.queryByText('Normal')).toBeNull();
  });

  it('exercício só de séries Normal não ganha etiqueta', async () => {
    await render(<LinhaDoExercicio item={exercicio('Supino reto')} ordem={1} />);

    expect(screen.queryByText('Normal')).toBeNull();
  });
});
