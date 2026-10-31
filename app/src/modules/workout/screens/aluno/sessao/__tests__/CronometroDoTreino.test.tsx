import { simplePrescriptionToSetPlan, type Workout, type WorkoutExercise } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  transicionar,
} from '../../../../store/maquinaDaSessao';
import { CronometroDoTreino } from '../CronometroDoTreino';

const T0 = Date.UTC(2026, 9, 22, 21, 0, 0);

function item(id: string): WorkoutExercise {
  return {
    id,
    workout_id: 'treino-a',
    exercise_id: `ex-${id}`,
    set_plan: simplePrescriptionToSetPlan({ sets: 3, reps: '12', weight: '', rest_seconds: 60 })
      .plan,
    order_index: 0,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    exercise: { id: `ex-${id}`, name: id, muscle_group: 'Pernas' } as WorkoutExercise['exercise'],
  };
}

const TREINO = { id: 'treino-a', title: 'Treino A', muscle_group: 'Pernas' } as Workout;
const VOZ = { mudo: false, alternarMudo: jest.fn(), ouvindo: false, alternarMicrofone: jest.fn() };

function sessaoCom(...acoes: AcaoDaSessao[]): EstadoDaSessao {
  const inicial = estadoInicial([item('Abdominal'), item('Abdução')]);
  return [{ tipo: 'iniciar', agora: T0 } as AcaoDaSessao, ...acoes].reduce(transicionar, inicial);
}

async function renderCronometro(sessao: EstadoDaSessao) {
  const despachar = jest.fn();
  await render(
    <CronometroDoTreino
      treino={TREINO}
      sessao={sessao}
      agora={T0}
      despachar={despachar}
      voz={VOZ}
      onConcluir={jest.fn()}
      onSair={jest.fn()}
    />
  );
  return despachar;
}

describe('o voltar do topo na série e no descanso (#441)', () => {
  it('no descanso, volta à lista em vez de encerrar o treino', async () => {
    const despachar = await renderCronometro(
      sessaoCom({ tipo: 'concluirSerie', agora: T0 + 1000 })
    );

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(despachar).toHaveBeenCalledWith({ tipo: 'terminarDescanso' });
  });

  it('na série, volta à lista sem registrar nada', async () => {
    const despachar = await renderCronometro(sessaoCom({ tipo: 'abrirSerie' }));

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(despachar).toHaveBeenCalledWith({ tipo: 'fecharSerie' });
  });
});
