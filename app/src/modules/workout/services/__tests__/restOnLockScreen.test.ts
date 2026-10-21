import type { WorkoutExercise } from '@elevapro/shared';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  transicionar,
} from '../../store/maquinaDaSessao';
import { restOnLockScreen } from '../restOnLockScreen';

const T0 = Date.UTC(2026, 8, 13, 10, 0, 0);
const segundos = (s: number) => T0 + s * 1000;

function item(peso: string | null, reps = '10'): WorkoutExercise {
  return {
    id: 'remada',
    workout_id: 'w1',
    exercise_id: 'ex-remada',
    sets: 4,
    reps,
    weight: peso,
    rest_seconds: 90,
    order_index: 0,
    notes: null,
    set_plan: null,
    created_at: '2026-09-01T00:00:00Z',
    exercise: {
      id: 'ex-remada',
      name: 'Remada curvada',
      muscle_group: 'Costas',
    } as WorkoutExercise['exercise'],
  };
}

const aplicar = (estado: EstadoDaSessao, ...acoes: AcaoDaSessao[]) =>
  acoes.reduce(transicionar, estado);

/** Duas séries feitas: o descanso antes da terceira, como no desenho 6c. */
function descansando(exercicio: WorkoutExercise): EstadoDaSessao {
  const serie = (de: number, ate: number): AcaoDaSessao[] => [
    { tipo: 'abrirSerie' },
    { tipo: 'alternarSerie', agora: segundos(de) },
    { tipo: 'concluirSerie', agora: segundos(ate) },
  ];
  return aplicar(
    estadoInicial([exercicio]),
    { tipo: 'iniciar', agora: T0 },
    ...serie(0, 40),
    { tipo: 'terminarDescanso' },
    ...serie(200, 240)
  );
}

describe('o descanso na tela bloqueada', () => {
  it('diz o exercício, a próxima série com carga e quando o descanso acaba', () => {
    expect(restOnLockScreen(descansando(item('45')), segundos(250))).toEqual({
      title: 'Descanso · Remada curvada',
      subtitle: 'Próxima: série 3 · 10 × 45 kg',
      endsAt: segundos(330),
      totalSeconds: 90,
      pausedRemaining: null,
      doneTitle: 'Hora da série 3',
      addLabel: '15 s',
      skipLabel: 'Pular',
    });
  });

  it('sem carga, diz as repetições; com tempo, só o tempo', () => {
    expect(restOnLockScreen(descansando(item(null)), segundos(250))?.subtitle).toBe(
      'Próxima: série 3 · 10 reps'
    );
    expect(restOnLockScreen(descansando(item(null, '10 min')), segundos(250))?.subtitle).toBe(
      'Próxima: série 3 · 10 min'
    );
  });

  it('pausado, para no que faltava e conta o fim a partir de agora', () => {
    const pausado = aplicar(descansando(item('45')), {
      tipo: 'pausarDescanso',
      agora: segundos(270),
    });
    const tela = restOnLockScreen(pausado, segundos(500));
    expect(tela?.pausedRemaining).toBe(60);
    expect(tela?.endsAt).toBe(segundos(560));
  });

  it('fora do descanso não mostra nada', () => {
    const emSerie = aplicar(descansando(item('45')), { tipo: 'terminarDescanso' });
    expect(restOnLockScreen(emSerie, segundos(250))).toBeNull();
    expect(restOnLockScreen(estadoInicial([item('45')]), T0)).toBeNull();
  });
});
