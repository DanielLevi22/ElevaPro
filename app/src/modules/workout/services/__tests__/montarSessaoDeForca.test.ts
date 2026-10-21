import { simplePrescriptionToSetPlan, type Workout, type WorkoutExercise } from '@elevapro/shared';
import { montarSessaoDeForca } from '../registroDaSessao';

describe('montarSessaoDeForca', () => {
  const INICIO = Date.UTC(2026, 8, 13, 10, 0, 0);
  const FIM = Date.UTC(2026, 8, 13, 11, 0, 0);
  const FEEDBACK = { alunoId: 's1', pse: 8, notas: 'pesado' };

  function prescricao(id: string, campos: Partial<WorkoutExercise> = {}): WorkoutExercise {
    return {
      id,
      workout_id: 'w1',
      exercise_id: `ex-${id}`,
      set_plan: simplePrescriptionToSetPlan({
        sets: 3,
        reps: '10-12',
        weight: '40 kg',
        rest_seconds: 90,
      }).plan,
      order_index: 0,
      notes: null,
      created_at: '2026-09-01T00:00:00Z',
      ...campos,
    };
  }

  const treino: Workout = {
    id: 'w1',
    specialist_id: 'p1',
    student_id: 's1',
    training_plan_id: 'tp1',
    title: 'Treino A',
    description: null,
    muscle_group: 'Costas',
    difficulty: null,
    day_of_week: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    exercises: [prescricao('remada'), prescricao('puxada')],
  };

  // O aluno subiu a carga da remada para 45 no meio do treino: o executado
  // muda, o prescrito continua o que o especialista escreveu.
  // #431: o aquecimento é gravado, mas marcado fora do volume do histórico.
  it('grava a série de aquecimento marcada fora do volume', () => {
    const gravar = montarSessaoDeForca(
      treino,
      {
        itens: [prescricao('remada'), prescricao('puxada')],
        feitas: {
          remada: [
            { reps: 15, carga: 20, contaVolume: false },
            { reps: 10, carga: 40 },
          ],
        },
        efforts: {},
        iniciadaEm: INICIO,
        concluidaEm: FIM,
      },
      FEEDBACK,
      FIM
    );

    const [aquecimento, trabalho] = gravar.items[0]?.sets ?? [];
    expect(aquecimento).toMatchObject({ counts_toward_volume: false });
    expect(trabalho).not.toHaveProperty('counts_toward_volume');
  });

  it('grava o prescrito do treino ao lado do executado com os ajustes', () => {
    const ajustada = prescricao('remada', {
      set_plan: simplePrescriptionToSetPlan({
        sets: 3,
        reps: '10-12',
        weight: '45',
        rest_seconds: 90,
      }).plan,
    });
    const gravar = montarSessaoDeForca(
      treino,
      {
        itens: [ajustada, prescricao('puxada')],
        feitas: { remada: [{ reps: 10, carga: 45 }] },
        efforts: { remada: 'easy' },
        iniciadaEm: INICIO,
        concluidaEm: FIM,
      },
      FEEDBACK,
      FIM
    );

    expect(gravar.items).toEqual([
      {
        workoutExerciseId: 'remada',
        exerciseId: 'ex-remada',
        effort: 'easy',
        sets: [
          {
            reps_prescribed: '10-12',
            reps_actual: 10,
            weight_prescribed: 40,
            weight_actual: 45,
            rest_prescribed: 90,
            completed: true,
          },
        ],
      },
    ]);
  });

  it('leva os instantes da sessão e o feedback', () => {
    const gravar = montarSessaoDeForca(
      treino,
      {
        itens: treino.exercises ?? [],
        feitas: {},
        efforts: {},
        iniciadaEm: INICIO,
        concluidaEm: FIM,
      },
      FEEDBACK,
      FIM + 5000
    );

    expect(gravar).toMatchObject({
      workoutId: 'w1',
      studentId: 's1',
      startedAt: '2026-09-13T10:00:00.000Z',
      completedAt: '2026-09-13T11:00:00.000Z',
      perceivedExertion: 8,
      notes: 'pesado',
      items: [],
    });
  });

  it('usa o instante da gravação quando a sessão não tem conclusão', () => {
    const gravar = montarSessaoDeForca(
      treino,
      { itens: [], feitas: {}, efforts: {}, iniciadaEm: INICIO, concluidaEm: null },
      FEEDBACK,
      FIM
    );
    expect(gravar.completedAt).toBe('2026-09-13T11:00:00.000Z');
  });
});
