import { applyQuickAdjust, type SetPrescription, type WorkoutExercise } from '@elevapro/shared';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  exercicioConcluido,
  proximaSerie,
  transicionar,
} from '../maquinaDaSessao';

const T0 = Date.UTC(2026, 9, 21, 10, 0, 0);

const serie = (campos: Partial<SetPrescription>): SetPrescription => ({
  methods: ['working'],
  reps: { mode: 'count', value: 10 },
  weight_kg: 80,
  rest_seconds: 90,
  target_rir: null,
  segments: [],
  ...campos,
});

const aquecimento = serie({
  methods: ['warmup'],
  reps: { mode: 'count', value: 15 },
  weight_kg: 40,
  rest_seconds: 30,
});
const restPause = serie({
  methods: ['rest_pause'],
  rest_seconds: 120,
  segments: [
    { reps: { mode: 'count', value: 4 }, weight_kg: 80, pause_seconds: 15, methods: [] },
    { reps: { mode: 'count', value: 2 }, weight_kg: 80, pause_seconds: 15, methods: [] },
  ],
});

function itemComPlano(id: string, plano: SetPrescription[]): WorkoutExercise {
  return {
    id,
    workout_id: 'w1',
    exercise_id: `ex-${id}`,
    order_index: 0,
    notes: null,
    set_plan: plano,
    created_at: '2026-10-01T00:00:00Z',
  };
}

function aplicar(estado: EstadoDaSessao, ...acoes: AcaoDaSessao[]): EstadoDaSessao {
  return acoes.reduce(transicionar, estado);
}

const concluir = (s: number): AcaoDaSessao => ({ tipo: 'concluirSerie', agora: T0 + s * 1000 });

describe('a sessão conduzida pelo plano de séries (#431)', () => {
  const agachamento = itemComPlano('agachamento', [aquecimento, serie({}), restPause]);
  const correndo = aplicar(estadoInicial([agachamento, itemComPlano('leg', [serie({})])]), {
    tipo: 'iniciar',
    agora: T0,
  });

  it('o descanso depois de cada série é o daquela série', () => {
    const depoisDoAquecimento = aplicar(correndo, concluir(10));
    expect(depoisDoAquecimento.descanso?.total).toBe(30);

    const depoisDaSegunda = aplicar(
      depoisDoAquecimento,
      { tipo: 'terminarDescanso' },
      concluir(60)
    );
    expect(depoisDaSegunda.descanso?.total).toBe(90);
  });

  it('a série registrada soma as repetições dos blocos e leva a carga da série', () => {
    const depois = aplicar(
      correndo,
      concluir(10),
      { tipo: 'terminarDescanso' },
      concluir(60),
      { tipo: 'terminarDescanso' },
      concluir(120)
    );
    expect(depois.feitas.agachamento).toEqual([
      { reps: 15, carga: 40, contaVolume: false },
      { reps: 10, carga: 80 },
      { reps: 16, carga: 80 },
    ]);
  });

  it('o número de séries do exercício é o do plano', () => {
    const depois = aplicar(
      correndo,
      concluir(10),
      { tipo: 'terminarDescanso' },
      concluir(60),
      { tipo: 'terminarDescanso' },
      concluir(120)
    );
    expect(exercicioConcluido(depois, agachamento)).toBe(true);
    expect(depois.atualId).toBe('leg');
  });

  it('a série da vez traz a prescrição dela, com técnicas e blocos', () => {
    const naTerceira = aplicar(correndo, concluir(10), { tipo: 'terminarDescanso' }, concluir(60), {
      tipo: 'terminarDescanso',
    });
    expect(proximaSerie(naTerceira)).toMatchObject({ numero: 3, prescricao: restPause });
  });

  // O lápis do aluno ajusta reps, carga e descanso das séries de trabalho; o
  // aquecimento continua sendo a primeira série.
  it('o ajuste do lápis vale nas séries de trabalho dali em diante', () => {
    // O lápis devolve o plano ajustado (applyQuickAdjust), como o AjusteDoExercicio.
    const ajustado = {
      ...agachamento,
      set_plan: applyQuickAdjust(agachamento.set_plan, {
        sets: 3,
        reps: '6',
        weight: '100',
        rest_seconds: 45,
      }),
    };
    const depois = aplicar(
      correndo,
      { tipo: 'ajustarExercicio', item: ajustado },
      concluir(10),
      { tipo: 'terminarDescanso' },
      concluir(60)
    );
    expect(depois.feitas.agachamento).toEqual([
      { reps: 15, carga: 40, contaVolume: false },
      { reps: 6, carga: 100 },
    ]);
    expect(depois.descanso?.total).toBe(45);
  });

  it('a carga sugerida entra nas séries que contam volume, não no aquecimento', () => {
    const inicial = estadoInicial([agachamento]);
    const sugerida = aplicar(
      inicial,
      { tipo: 'applySuggestedLoads', weights: { agachamento: '85' } },
      { tipo: 'iniciar', agora: T0 },
      concluir(10),
      { tipo: 'terminarDescanso' },
      concluir(60)
    );
    expect(sugerida.feitas.agachamento).toEqual([
      { reps: 15, carga: 40, contaVolume: false },
      { reps: 10, carga: 85 },
    ]);
  });

  it('na semana de descarga o plano perde séries do fim', () => {
    const inicial = estadoInicial([
      itemComPlano('supino', [aquecimento, serie({}), serie({}), serie({})]),
    ]);
    const descarga = aplicar(inicial, { tipo: 'applyDeload' });
    const [supino] = descarga.itens;
    expect(supino?.set_plan).toHaveLength(2);
    expect(supino?.set_plan?.[0]).toEqual(aquecimento);
  });

  // Somar só as partes com número gravaria menos do que o aluno fez.
  it('série com parte até a falha grava as repetições como desconhecidas', () => {
    const dropAteAFalha = serie({
      methods: ['drop_set'],
      reps: { mode: 'failure' },
      segments: [
        { reps: { mode: 'count', value: 4 }, weight_kg: 60, pause_seconds: 0, methods: [] },
      ],
    });
    const depois = aplicar(
      aplicar(estadoInicial([itemComPlano('rosca', [dropAteAFalha])]), {
        tipo: 'iniciar',
        agora: T0,
      }),
      concluir(10)
    );
    expect(depois.feitas.rosca).toEqual([{ reps: null, carga: 80 }]);
  });
});
