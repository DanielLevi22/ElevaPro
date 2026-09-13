import type { WorkoutExercise } from '@elevapro/shared';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  progressoDaSessao,
  proximaSerie,
  restanteDoDescanso,
  transicionar,
} from '../maquinaDaSessao';

const T0 = Date.UTC(2026, 8, 13, 10, 0, 0);
const segundos = (s: number) => T0 + s * 1000;

function item(id: string, series: number, descanso = 90): WorkoutExercise {
  return {
    id,
    workout_id: 'w1',
    exercise_id: `ex-${id}`,
    sets: series,
    reps: '10',
    weight: '40',
    rest_seconds: descanso,
    order_index: 0,
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    exercise: { id: `ex-${id}`, name: id, muscle_group: 'Costas' } as WorkoutExercise['exercise'],
  };
}

function aplicar(estado: EstadoDaSessao, ...acoes: AcaoDaSessao[]): EstadoDaSessao {
  return acoes.reduce(transicionar, estado);
}

describe('máquina da sessão de treino', () => {
  const inicial = estadoInicial([item('puxada', 2), item('remada', 1)]);

  it('começa no pré-início, sem relógio', () => {
    expect(inicial.etapa).toBe('preInicio');
    expect(inicial.iniciadaEm).toBeNull();
  });

  it('percorre pré-início → execução → descanso → execução → feedback → resumo', () => {
    const etapas: string[] = [];
    let estado = inicial;
    const passos: AcaoDaSessao[] = [
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: segundos(60) },
      { tipo: 'tique', agora: segundos(150) },
      { tipo: 'check', agora: segundos(200) },
      { tipo: 'terminarDescanso' },
      { tipo: 'check', agora: segundos(400) },
      { tipo: 'salva' },
    ];
    for (const passo of passos) {
      estado = transicionar(estado, passo);
      etapas.push(estado.etapa);
    }

    expect(etapas).toEqual([
      'execucao',
      'descanso',
      'execucao',
      'descanso',
      'execucao',
      'feedback',
      'resumo',
    ]);
    expect(estado.concluidaEm).toBe(segundos(400));
  });

  it('registra a série com as repetições e a carga do exercício', () => {
    const estado = aplicar(inicial, { tipo: 'iniciar', agora: T0 }, { tipo: 'check', agora: T0 });
    expect(estado.feitas.puxada).toEqual([{ reps: 10, carga: 40 }]);
    expect(estado.ultima).toEqual({ reps: 10, carga: 40 });
  });

  it('passa ao próximo exercício quando as séries do atual acabam', () => {
    const estado = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 },
      { tipo: 'terminarDescanso' },
      { tipo: 'check', agora: T0 },
      { tipo: 'terminarDescanso' }
    );
    expect(estado.atualId).toBe('remada');
    expect(progressoDaSessao(estado)).toEqual({
      exercicio: 2,
      exercicios: 2,
      seriesFeitas: 2,
      seriesTotais: 3,
    });
  });

  it('volta à execução quando o tempo do descanso acaba', () => {
    const descansando = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 }
    );
    expect(aplicar(descansando, { tipo: 'tique', agora: segundos(89) }).etapa).toBe('descanso');
    expect(aplicar(descansando, { tipo: 'tique', agora: segundos(90) }).etapa).toBe('execucao');
  });

  it('soma e tira 15 s do descanso, sem ir abaixo de zero', () => {
    const descansando = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 }
    );

    const mais = aplicar(descansando, { tipo: 'ajustarDescanso', segundos: 15, agora: T0 });
    expect(restanteDoDescanso(mais, T0)).toBe(105);
    expect(mais.descanso?.total).toBe(105);

    const menos = aplicar(descansando, { tipo: 'ajustarDescanso', segundos: -15, agora: T0 });
    expect(restanteDoDescanso(menos, T0)).toBe(75);
    // O total não encolhe: o anel mostra quanto falta do intervalo prescrito.
    expect(menos.descanso?.total).toBe(90);

    const quaseNoFim = aplicar(descansando, { tipo: 'tique', agora: segundos(80) });
    const zerado = aplicar(quaseNoFim, {
      tipo: 'ajustarDescanso',
      segundos: -15,
      agora: segundos(80),
    });
    expect(zerado.etapa).toBe('execucao');
    expect(restanteDoDescanso(zerado, segundos(80))).toBe(0);
  });

  it('leva ao feedback no check da última série, sem descanso antes', () => {
    const estado = aplicar(
      estadoInicial([item('rosca', 1)]),
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: segundos(30) }
    );
    expect(estado.etapa).toBe('feedback');
    expect(estado.descanso).toBeNull();
  });

  it('não descansa quando o exercício não prescreve descanso', () => {
    const estado = aplicar(
      estadoInicial([item('prancha', 2, 0)]),
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 }
    );
    expect(estado.etapa).toBe('execucao');
  });

  it('congela o descanso na pausa e retoma de onde parou', () => {
    const pausado = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 },
      { tipo: 'pausarDescanso', agora: segundos(30) }
    );
    expect(aplicar(pausado, { tipo: 'tique', agora: segundos(500) }).etapa).toBe('descanso');
    expect(restanteDoDescanso(pausado, segundos(500))).toBe(60);

    const retomado = aplicar(pausado, { tipo: 'retomarDescanso', agora: segundos(500) });
    expect(restanteDoDescanso(retomado, segundos(510))).toBe(50);
  });

  it('finaliza antes da hora e volta ao treino se o aluno fechar o feedback', () => {
    const noFeedback = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'finalizar', agora: segundos(100) }
    );
    expect(noFeedback.etapa).toBe('feedback');
    expect(noFeedback.concluidaEm).toBe(segundos(100));

    const deVolta = aplicar(noFeedback, { tipo: 'voltarAoTreino' });
    expect(deVolta.etapa).toBe('execucao');
    expect(deVolta.concluidaEm).toBeNull();
  });

  it('deixa escolher outro exercício da lista, sem perder o que foi feito', () => {
    const estado = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'check', agora: T0 },
      { tipo: 'terminarDescanso' },
      { tipo: 'escolher', itemId: 'remada' }
    );
    expect(estado.atualId).toBe('remada');
    expect(estado.feitas.puxada).toHaveLength(1);
  });

  it('usa os valores ajustados no check seguinte', () => {
    const ajustado = { ...item('puxada', 2), weight: '47.5', reps: '8' };
    const estado = aplicar(
      inicial,
      { tipo: 'iniciar', agora: T0 },
      { tipo: 'ajustarExercicio', item: ajustado },
      { tipo: 'check', agora: T0 }
    );
    expect(estado.feitas.puxada).toEqual([{ reps: 8, carga: 47.5 }]);
  });

  it('diz qual é a próxima série durante o descanso', () => {
    const estado = aplicar(inicial, { tipo: 'iniciar', agora: T0 }, { tipo: 'check', agora: T0 });
    expect(proximaSerie(estado)).toMatchObject({ item: { id: 'puxada' }, numero: 2 });
  });
});
