import type { WorkoutExercise } from '@elevapro/shared';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  emAndamento,
  estadoInicial,
  exercicioConcluido,
  progressoDaSessao,
  proximaSerie,
  restanteDoDescanso,
  tempoDaSerie,
  tempoDaSessao,
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

/** Abre a série, conta de `de` a `ate` segundos e conclui. */
function fazerSerie(de: number, ate: number): AcaoDaSessao[] {
  return [
    { tipo: 'abrirSerie' },
    { tipo: 'alternarSerie', agora: segundos(de) },
    { tipo: 'concluirSerie', agora: segundos(ate) },
  ];
}

describe('máquina da sessão de treino', () => {
  const inicial = estadoInicial([item('puxada', 2), item('remada', 1)]);
  const emExecucao = aplicar(inicial, { tipo: 'iniciar', agora: T0 });

  it('começa no pré-início, sem relógio', () => {
    expect(inicial.momento).toBe('preInicio');
    expect(inicial.iniciadaEm).toBeNull();
  });

  it('percorre pré-início → execução → série → descanso → execução → feedback → resumo', () => {
    const momentos: string[] = [];
    let estado = inicial;
    const passos: AcaoDaSessao[] = [
      { tipo: 'iniciar', agora: T0 },
      ...fazerSerie(10, 40),
      { tipo: 'tique', agora: segundos(130) },
      ...fazerSerie(140, 170),
      { tipo: 'terminarDescanso' },
      ...fazerSerie(200, 230),
      { tipo: 'salva' },
    ];
    for (const passo of passos) {
      estado = transicionar(estado, passo);
      momentos.push(estado.momento);
    }

    expect(momentos).toEqual([
      'execucao',
      'serie',
      'serie',
      'descanso',
      'execucao',
      'serie',
      'serie',
      'descanso',
      'execucao',
      'serie',
      'serie',
      'feedback',
      'resumo',
    ]);
    expect(estado.concluidaEm).toBe(segundos(230));
  });

  // O aluno abre a série para se posicionar; o tempo do exercício só começa
  // quando ele diz que começou.
  it('abre a série parada em zero, e só conta depois do play', () => {
    const aberta = aplicar(emExecucao, { tipo: 'abrirSerie' });
    expect(aberta.momento).toBe('serie');
    expect(tempoDaSerie(aberta, segundos(30))).toBe(0);

    const correndo = aplicar(aberta, { tipo: 'alternarSerie', agora: segundos(30) });
    expect(tempoDaSerie(correndo, segundos(42))).toBe(12);
  });

  it('pausa e retoma o tempo do exercício, e zera sem sair da série', () => {
    const pausada = aplicar(
      emExecucao,
      { tipo: 'abrirSerie' },
      { tipo: 'alternarSerie', agora: segundos(0) },
      { tipo: 'alternarSerie', agora: segundos(20) }
    );
    expect(tempoDaSerie(pausada, segundos(500))).toBe(20);

    const retomada = aplicar(pausada, { tipo: 'alternarSerie', agora: segundos(500) });
    expect(tempoDaSerie(retomada, segundos(505))).toBe(25);

    const zerada = aplicar(retomada, { tipo: 'zerarSerie' });
    expect(zerada.momento).toBe('serie');
    expect(tempoDaSerie(zerada, segundos(600))).toBe(0);
  });

  it('registra a série com repetições, carga e quanto ela levou', () => {
    const estado = aplicar(emExecucao, ...fazerSerie(0, 35));
    expect(estado.feitas.puxada).toEqual([{ reps: 10, carga: 40 }]);
    expect(estado.ultima).toEqual({ reps: 10, carga: 40 });
    expect(estado.duracaoDaUltima).toBe(35);
  });

  it('começa o descanso sozinho quando a série termina', () => {
    const estado = aplicar(emExecucao, ...fazerSerie(0, 35));
    expect(estado.momento).toBe('descanso');
    expect(restanteDoDescanso(estado, segundos(35))).toBe(90);
  });

  it('fecha a série sem registrar nada', () => {
    const estado = aplicar(emExecucao, { tipo: 'abrirSerie' }, { tipo: 'fecharSerie' });
    expect(estado.momento).toBe('execucao');
    expect(estado.feitas.puxada).toBeUndefined();
  });

  it('passa ao próximo exercício quando as séries do atual acabam', () => {
    const estado = aplicar(
      emExecucao,
      ...fazerSerie(0, 30),
      { tipo: 'terminarDescanso' },
      ...fazerSerie(40, 70),
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
    const descansando = aplicar(emExecucao, ...fazerSerie(0, 0));
    expect(aplicar(descansando, { tipo: 'tique', agora: segundos(89) }).momento).toBe('descanso');
    expect(aplicar(descansando, { tipo: 'tique', agora: segundos(90) }).momento).toBe('execucao');
  });

  it('soma e tira 15 s do descanso, sem ir abaixo de zero', () => {
    const descansando = aplicar(emExecucao, ...fazerSerie(0, 0));

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
    expect(zerado.momento).toBe('execucao');
    expect(restanteDoDescanso(zerado, segundos(80))).toBe(0);
  });

  it('pausa e retoma o descanso no play, de onde parou', () => {
    const pausado = aplicar(emExecucao, ...fazerSerie(0, 0), {
      tipo: 'alternarDescanso',
      agora: segundos(30),
    });
    expect(aplicar(pausado, { tipo: 'tique', agora: segundos(500) }).momento).toBe('descanso');
    expect(restanteDoDescanso(pausado, segundos(500))).toBe(60);

    const retomado = aplicar(pausado, { tipo: 'alternarDescanso', agora: segundos(500) });
    expect(restanteDoDescanso(retomado, segundos(510))).toBe(50);
  });

  it('leva ao feedback na última série, sem descanso antes', () => {
    const estado = aplicar(
      estadoInicial([item('rosca', 1)]),
      { tipo: 'iniciar', agora: T0 },
      ...fazerSerie(0, 30)
    );
    expect(estado.momento).toBe('feedback');
    expect(estado.descanso).toBeNull();
  });

  it('não descansa quando o exercício não prescreve descanso', () => {
    const estado = aplicar(
      estadoInicial([item('prancha', 2, 0)]),
      { tipo: 'iniciar', agora: T0 },
      ...fazerSerie(0, 30)
    );
    expect(estado.momento).toBe('execucao');
  });

  // "Feito" por voz, com o celular longe da mão, registra da própria lista.
  it('conclui pela lista quando o aluno fala, sem duração', () => {
    const estado = aplicar(emExecucao, { tipo: 'concluirSerie', agora: segundos(10) });
    expect(estado.feitas.puxada).toHaveLength(1);
    expect(estado.duracaoDaUltima).toBeNull();
    expect(estado.momento).toBe('descanso');
  });

  it('finaliza antes da hora e volta ao treino se o aluno fechar o feedback', () => {
    const noFeedback = aplicar(emExecucao, { tipo: 'finalizar', agora: segundos(100) });
    expect(noFeedback.momento).toBe('feedback');
    expect(noFeedback.concluidaEm).toBe(segundos(100));

    const deVolta = aplicar(noFeedback, { tipo: 'voltarAoTreino' });
    expect(deVolta.momento).toBe('execucao');
    expect(deVolta.concluidaEm).toBeNull();
  });

  it('deixa escolher outro exercício da lista, sem perder o que foi feito', () => {
    const estado = aplicar(
      emExecucao,
      ...fazerSerie(0, 30),
      { tipo: 'terminarDescanso' },
      { tipo: 'escolher', itemId: 'remada' }
    );
    expect(estado.atualId).toBe('remada');
    expect(estado.feitas.puxada).toHaveLength(1);
  });

  it('usa os valores ajustados na série seguinte', () => {
    const ajustado = { ...item('puxada', 2), weight: '47.5', reps: '8' };
    const estado = aplicar(
      emExecucao,
      { tipo: 'ajustarExercicio', item: ajustado },
      ...fazerSerie(0, 30)
    );
    expect(estado.feitas.puxada).toEqual([{ reps: 8, carga: 47.5 }]);
  });

  it('diz qual é a próxima série durante o descanso', () => {
    const estado = aplicar(emExecucao, ...fazerSerie(0, 30));
    expect(proximaSerie(estado)).toMatchObject({ item: { id: 'puxada' }, numero: 2 });
  });

  // A lista só oferece os exercícios "A seguir"; a guarda é para o que chega por
  // fora dela — um toque atrasado depois da última série, ou a voz.
  it('não troca para um exercício já concluído, nem fora da execução', () => {
    const umaSerie = estadoInicial([item('puxada', 1), item('remada', 1)]);
    const puxadaFeita = aplicar(umaSerie, { tipo: 'iniciar', agora: T0 }, ...fazerSerie(0, 30), {
      tipo: 'terminarDescanso',
    });
    expect(aplicar(puxadaFeita, { tipo: 'escolher', itemId: 'puxada' }).atualId).toBe('remada');

    const noDescanso = aplicar(emExecucao, ...fazerSerie(0, 30));
    expect(aplicar(noDescanso, { tipo: 'escolher', itemId: 'remada' })).toBe(noDescanso);
    expect(aplicar(emExecucao, { tipo: 'escolher', itemId: 'inexistente' })).toBe(emExecucao);
  });

  // Finalizar do pré-início pularia direto para o feedback de um treino que não
  // começou, e do resumo apagaria o horário de conclusão já gravado.
  it('só finaliza com o treino correndo', () => {
    const finalizar: AcaoDaSessao = { tipo: 'finalizar', agora: segundos(50) };
    expect(aplicar(inicial, finalizar)).toBe(inicial);

    const noResumo = aplicar(emExecucao, finalizar, { tipo: 'salva' });
    expect(aplicar(noResumo, { tipo: 'finalizar', agora: segundos(99) })).toBe(noResumo);

    const naSerie = aplicar(emExecucao, { tipo: 'abrirSerie' });
    expect(aplicar(naSerie, finalizar)).toMatchObject({ momento: 'feedback', serie: null });
  });

  it('considera em andamento só a execução, a série e o descanso', () => {
    const momentos = ['preInicio', 'execucao', 'serie', 'descanso', 'feedback', 'resumo'] as const;
    expect(momentos.filter(emAndamento)).toEqual(['execucao', 'serie', 'descanso']);
  });

  it('marca o exercício como concluído depois da última série', () => {
    const [puxada] = emExecucao.itens;
    const umaFeita = aplicar(emExecucao, ...fazerSerie(0, 30));
    expect(exercicioConcluido(umaFeita, puxada)).toBe(false);
    const duasFeitas = aplicar(umaFeita, { tipo: 'terminarDescanso' }, ...fazerSerie(40, 70));
    expect(exercicioConcluido(duasFeitas, puxada)).toBe(true);
  });

  it('conta o tempo do treino desde o início, e zero antes dele', () => {
    expect(tempoDaSessao(inicial, segundos(10))).toBe(0);
    expect(tempoDaSessao(emExecucao, segundos(90))).toBe(90);
  });
});
