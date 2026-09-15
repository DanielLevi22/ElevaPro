import {
  type CardioSessionState,
  elapsedMs,
  goalProgress,
  initialCardioSession,
  lapSummaries,
  transitionCardio,
} from '../cardioSessionMachine';

const T0 = 1_000_000;
const MINUTE = 60_000;

function apply(state: CardioSessionState, ...actions: Parameters<typeof transitionCardio>[1][]) {
  return actions.reduce(transitionCardio, state);
}

describe('sessão de cardio — da escolha ao ao vivo', () => {
  it('começa na escolha da modalidade, sem nada contando', () => {
    const state = initialCardioSession();
    expect(state.moment).toBe('select');
    expect(elapsedMs(state, T0)).toBe(0);
  });

  it('escolher a modalidade abre a tela dela, e voltar retorna à escolha', () => {
    const chosen = apply(initialCardioSession(), { type: 'chooseModality', modalityId: 'run' });
    expect(chosen).toMatchObject({ moment: 'modality', modalityId: 'run' });

    expect(apply(chosen, { type: 'back' }).moment).toBe('select');
  });

  it('a meta confirmada volta para a modalidade com a meta escolhida', () => {
    const state = apply(
      initialCardioSession(),
      { type: 'chooseModality', modalityId: 'bike' },
      { type: 'openGoal' },
      { type: 'confirmGoal', minutes: 30 }
    );
    expect(state).toMatchObject({ moment: 'modality', goalMinutes: 30 });
  });

  it('pular a meta deixa a sessão livre', () => {
    const state = apply(
      initialCardioSession(),
      { type: 'chooseModality', modalityId: 'bike' },
      { type: 'openGoal' },
      { type: 'confirmGoal', minutes: null }
    );
    expect(state.goalMinutes).toBeNull();
  });

  it('repetir a última abre a modalidade com a meta da última sessão', () => {
    const state = apply(initialCardioSession(), {
      type: 'repeatLast',
      modalityId: 'walk',
      goalMinutes: 45,
    });
    expect(state).toMatchObject({ moment: 'modality', modalityId: 'walk', goalMinutes: 45 });
  });

  it('iniciar leva ao vivo e começa a contar a partir do instante', () => {
    const state = apply(
      initialCardioSession(),
      { type: 'chooseModality', modalityId: 'run' },
      { type: 'start', now: T0 }
    );
    expect(state.moment).toBe('live');
    expect(state.startedAt).toBe(T0);
    expect(elapsedMs(state, T0 + 5 * MINUTE)).toBe(5 * MINUTE);
  });

  it('ação fora do momento não muda nada', () => {
    const state = initialCardioSession();
    expect(apply(state, { type: 'start', now: T0 })).toBe(state);
    expect(apply(state, { type: 'openGoal' })).toBe(state);
  });
});

function running(goalMinutes: number | null = null): CardioSessionState {
  return apply(
    initialCardioSession(),
    { type: 'chooseModality', modalityId: 'run' },
    { type: 'openGoal' },
    { type: 'confirmGoal', minutes: goalMinutes },
    { type: 'start', now: T0 }
  );
}

describe('sessão de cardio — pausa, voltas e meta', () => {
  it('o tempo parado na pausa não conta', () => {
    const state = apply(
      running(),
      { type: 'pause', now: T0 + 10 * MINUTE },
      { type: 'resume', now: T0 + 15 * MINUTE }
    );
    expect(state.moment).toBe('live');
    expect(elapsedMs(state, T0 + 20 * MINUTE)).toBe(15 * MINUTE);
  });

  it('pausado, o relógio da sessão fica parado', () => {
    const state = apply(running(), { type: 'pause', now: T0 + 10 * MINUTE });
    expect(state.moment).toBe('paused');
    expect(elapsedMs(state, T0 + 50 * MINUTE)).toBe(10 * MINUTE);
  });

  it('cada volta guarda o tempo e a distância, e o resumo sai das marcas', () => {
    const state = apply(
      running(),
      { type: 'lap', now: T0 + 6 * MINUTE, distanceMeters: 1200 },
      { type: 'lap', now: T0 + 13 * MINUTE, distanceMeters: 2600 },
      { type: 'finish', now: T0 + 20 * MINUTE }
    );
    expect(lapSummaries(state, 4000)).toEqual([
      { durationMs: 6 * MINUTE, distanceMeters: 1200 },
      { durationMs: 7 * MINUTE, distanceMeters: 1400 },
      { durationMs: 7 * MINUTE, distanceMeters: 1400 },
    ]);
  });

  it('sem gps, a volta tem só a duração', () => {
    const state = apply(
      running(),
      { type: 'lap', now: T0 + 6 * MINUTE, distanceMeters: null },
      { type: 'finish', now: T0 + 10 * MINUTE }
    );
    expect(lapSummaries(state, null)).toEqual([
      { durationMs: 6 * MINUTE, distanceMeters: null },
      { durationMs: 4 * MINUTE, distanceMeters: null },
    ]);
  });

  it('as pausas ficam guardadas com início e fim, para o percurso descontar', () => {
    const state = apply(
      running(),
      { type: 'pause', now: T0 + 10 * MINUTE },
      { type: 'resume', now: T0 + 15 * MINUTE },
      { type: 'pause', now: T0 + 20 * MINUTE }
    );
    expect(state.pauses).toEqual([
      { start: T0 + 10 * MINUTE, end: T0 + 15 * MINUTE },
      { start: T0 + 20 * MINUTE, end: null },
    ]);
  });

  it('volta só se marca com a sessão correndo', () => {
    const paused = apply(running(), { type: 'pause', now: T0 + MINUTE });
    expect(apply(paused, { type: 'lap', now: T0 + 2 * MINUTE, distanceMeters: null })).toBe(paused);
  });

  it('a meta é batida uma vez só, no instante em que o tempo a alcança', () => {
    const before = apply(running(30), { type: 'tick', now: T0 + 29 * MINUTE });
    expect(before.goalReachedAt).toBeNull();

    const reached = apply(before, { type: 'tick', now: T0 + 30 * MINUTE });
    expect(reached.goalReachedAt).toBe(T0 + 30 * MINUTE);

    const later = apply(reached, { type: 'tick', now: T0 + 31 * MINUTE });
    expect(later.goalReachedAt).toBe(T0 + 30 * MINUTE);
  });

  it('o progresso da meta vai de 0 a 1 e para no fim; sem meta não há progresso', () => {
    expect(goalProgress(running(30), T0 + 15 * MINUTE)).toBe(0.5);
    expect(goalProgress(running(30), T0 + 40 * MINUTE)).toBe(1);
    expect(goalProgress(running(null), T0 + 15 * MINUTE)).toBeNull();
  });

  it('o percurso abre por cima da sessão e fecha sem mudar o momento', () => {
    const open = apply(running(), { type: 'openRoute' });
    expect(open).toMatchObject({ moment: 'live', routeOpen: true });
    expect(apply(open, { type: 'closeRoute' }).routeOpen).toBe(false);
  });
});

describe('sessão de cardio — fim', () => {
  it('finalizar congela o fim e leva ao feedback, com o percurso fechado', () => {
    const state = apply(
      running(),
      { type: 'openRoute' },
      { type: 'finish', now: T0 + 20 * MINUTE }
    );
    expect(state).toMatchObject({
      moment: 'feedback',
      finishedAt: T0 + 20 * MINUTE,
      routeOpen: false,
    });
    expect(elapsedMs(state, T0 + 90 * MINUTE)).toBe(20 * MINUTE);
  });

  it('finalizar a partir da pausa guarda o fim no instante do toque', () => {
    const state = apply(
      running(),
      { type: 'pause', now: T0 + 10 * MINUTE },
      { type: 'finish', now: T0 + 12 * MINUTE }
    );
    expect(state.finishedAt).toBe(T0 + 12 * MINUTE);
    expect(elapsedMs(state, T0 + 12 * MINUTE)).toBe(10 * MINUTE);
  });

  it('salvar leva ao resumo', () => {
    const state = apply(running(), { type: 'finish', now: T0 + MINUTE }, { type: 'saved' });
    expect(state.moment).toBe('summary');
  });

  // "Descartar" é pedido explícito de apagar a sessão iniciada por engano: nada
  // dela sobrevive, e o aluno volta à escolha como se não tivesse começado.
  it('descartar volta à escolha sem nada da sessão', () => {
    const state = apply(running(30), { type: 'finish', now: T0 + MINUTE }, { type: 'discard' });
    expect(state).toEqual(initialCardioSession());
  });

  // A tela do cardio é uma aba e fica montada: sem recomeçar, quem voltava ao
  // cardio depois de salvar via o resumo da sessão anterior (visto no emulador).
  it('recomeçar a partir do resumo volta à escolha sem nada da sessão', () => {
    const summary = apply(running(30), { type: 'finish', now: T0 + MINUTE }, { type: 'saved' });

    expect(apply(summary, { type: 'restart' })).toEqual(initialCardioSession());
  });

  it('recomeçar no meio da sessão não apaga nada', () => {
    const live = running(30);

    expect(apply(live, { type: 'restart' })).toBe(live);
  });
});
