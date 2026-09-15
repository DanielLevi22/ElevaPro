import {
  type Cronometro,
  cronometroParado,
  pausarCronometro,
  soltarCronometro,
} from './cronometro';

/**
 * A sessão de cardio como uma sequência de estados (issue #304):
 *
 *     escolha → modalidade ⇄ meta → ao vivo ⇄ pausado → feedback → resumo
 *
 * Como a sessão de musculação (`maquinaDaSessao`), cada transição é pura e recebe
 * o instante: o estado guarda instantes, não contagens, e voltar do background
 * chega com o tempo certo. O percurso não é um momento, é uma vista aberta por
 * cima da sessão ao vivo ou da pausa.
 */
export type CardioMoment =
  | 'select'
  | 'modality'
  | 'goal'
  | 'live'
  | 'paused'
  | 'feedback'
  | 'summary';

export type CardioModalityId = 'walk' | 'run' | 'bike' | 'elliptical' | 'swim';

export interface CardioSessionState {
  moment: CardioMoment;
  modalityId: CardioModalityId | null;
  /** Duração alvo em minutos, ou `null` para sessão livre. */
  goalMinutes: number | null;
  stopwatch: Cronometro;
  startedAt: number | null;
  finishedAt: number | null;
  /** Cada volta marcada: o tempo da sessão e a distância acumulada naquele instante. */
  lapMarks: LapMark[];
  /** Os intervalos em pausa, em instantes. O percurso os desconta das parciais. */
  pauses: PauseInterval[];
  /** Quando a meta foi batida. Guardado para a vibração disparar uma vez só. */
  goalReachedAt: number | null;
  /** O percurso aberto por cima da sessão. */
  routeOpen: boolean;
}

export interface LapMark {
  elapsedMs: number;
  /** `null` na modalidade sem GPS. */
  distanceMeters: number | null;
}

export interface PauseInterval {
  start: number;
  /** `null` enquanto a sessão está pausada. */
  end: number | null;
}

export interface LapSummary {
  durationMs: number;
  distanceMeters: number | null;
}

type NoPayload = Record<never, never>;

interface ActionPayloads {
  chooseModality: { modalityId: CardioModalityId };
  repeatLast: { modalityId: CardioModalityId; goalMinutes: number | null };
  openGoal: NoPayload;
  confirmGoal: { minutes: number | null };
  back: NoPayload;
  start: { now: number };
  pause: { now: number };
  resume: { now: number };
  lap: { now: number; distanceMeters: number | null };
  tick: { now: number };
  openRoute: NoPayload;
  closeRoute: NoPayload;
  finish: { now: number };
  saved: NoPayload;
  discard: NoPayload;
  restart: NoPayload;
}

type ActionType = keyof ActionPayloads;
type ActionOf<T extends ActionType> = { type: T } & ActionPayloads[T];
export type CardioAction = { [T in ActionType]: ActionOf<T> }[ActionType];

const MINUTE_MS = 60_000;

/**
 * @example
 * const [session, dispatch] = useReducer(transitionCardio, undefined, initialCardioSession);
 */
export function initialCardioSession(): CardioSessionState {
  return {
    moment: 'select',
    modalityId: null,
    goalMinutes: null,
    stopwatch: cronometroParado(),
    startedAt: null,
    finishedAt: null,
    lapMarks: [],
    pauses: [],
    goalReachedAt: null,
    routeOpen: false,
  };
}

/**
 * Milissegundos contados até `now`, sem o tempo parado.
 *
 * @example elapsedMs(session, Date.now())
 */
export function elapsedMs(state: CardioSessionState, now: number): number {
  const { acumuladoMs, desde } = state.stopwatch;
  return acumuladoMs + (desde === null ? 0 : Math.max(0, now - desde));
}

/**
 * Fração da meta já cumprida, de 0 a 1, ou `null` na sessão livre.
 *
 * @example goalProgress(session, Date.now()) // 0.62
 */
export function goalProgress(state: CardioSessionState, now: number): number | null {
  if (state.goalMinutes === null) return null;
  return Math.min(1, elapsedMs(state, now) / (state.goalMinutes * MINUTE_MS));
}

/**
 * Duração e distância de cada volta. Com a sessão finalizada, o trecho depois da
 * última marca entra como a volta final, medido até a distância total.
 *
 * @example lapSummaries(session, 7400) // [{ durationMs: 372000, distanceMeters: 2500 }, ...]
 */
export function lapSummaries(
  state: CardioSessionState,
  totalDistanceMeters: number | null
): LapSummary[] {
  const finalMark: LapMark[] =
    state.finishedAt === null
      ? []
      : [{ elapsedMs: state.stopwatch.acumuladoMs, distanceMeters: totalDistanceMeters }];
  const marks = [...state.lapMarks, ...finalMark];
  return marks.map((mark, index) => {
    const previous = marks[index - 1];
    return {
      durationMs: mark.elapsedMs - (previous?.elapsedMs ?? 0),
      distanceMeters:
        mark.distanceMeters === null ? null : mark.distanceMeters - (previous?.distanceMeters ?? 0),
    };
  });
}

const isRunning = (state: CardioSessionState): boolean =>
  state.moment === 'live' || state.moment === 'paused';

function start(state: CardioSessionState, now: number): CardioSessionState {
  if (state.moment !== 'modality' || !state.modalityId) return state;
  return {
    ...state,
    moment: 'live',
    startedAt: now,
    stopwatch: soltarCronometro(cronometroParado(), now),
  };
}

function back(state: CardioSessionState): CardioSessionState {
  if (state.moment === 'modality') return { ...state, moment: 'select' };
  if (state.moment === 'goal') return { ...state, moment: 'modality' };
  return state;
}

function lap(
  state: CardioSessionState,
  now: number,
  distanceMeters: number | null
): CardioSessionState {
  if (state.moment !== 'live') return state;
  const mark = elapsedMs(state, now);
  const last = state.lapMarks[state.lapMarks.length - 1]?.elapsedMs ?? 0;
  if (mark <= last) return state;
  return { ...state, lapMarks: [...state.lapMarks, { elapsedMs: mark, distanceMeters }] };
}

function closeOpenPause(pauses: PauseInterval[], now: number): PauseInterval[] {
  return pauses.map((pause) => (pause.end === null ? { ...pause, end: now } : pause));
}

function pause(state: CardioSessionState, now: number): CardioSessionState {
  if (state.moment !== 'live') return state;
  return {
    ...state,
    moment: 'paused',
    stopwatch: pausarCronometro(state.stopwatch, now),
    pauses: [...state.pauses, { start: now, end: null }],
  };
}

function resume(state: CardioSessionState, now: number): CardioSessionState {
  if (state.moment !== 'paused') return state;
  return {
    ...state,
    moment: 'live',
    stopwatch: soltarCronometro(state.stopwatch, now),
    pauses: closeOpenPause(state.pauses, now),
  };
}

function tick(state: CardioSessionState, now: number): CardioSessionState {
  if (state.moment !== 'live' || state.goalReachedAt !== null) return state;
  return goalProgress(state, now) === 1 ? { ...state, goalReachedAt: now } : state;
}

function finish(state: CardioSessionState, now: number): CardioSessionState {
  if (!isRunning(state)) return state;
  return {
    ...state,
    moment: 'feedback',
    finishedAt: now,
    routeOpen: false,
    stopwatch: pausarCronometro(state.stopwatch, now),
    pauses: closeOpenPause(state.pauses, now),
  };
}

/** Uma função por ação: a tabela é o mapa inteiro da máquina. */
const TRANSITIONS: {
  [T in ActionType]: (state: CardioSessionState, action: ActionOf<T>) => CardioSessionState;
} = {
  chooseModality: (state, { modalityId }) =>
    state.moment === 'select' ? { ...state, moment: 'modality', modalityId } : state,
  repeatLast: (state, { modalityId, goalMinutes }) =>
    state.moment === 'select' ? { ...state, moment: 'modality', modalityId, goalMinutes } : state,
  openGoal: (state) => (state.moment === 'modality' ? { ...state, moment: 'goal' } : state),
  confirmGoal: (state, { minutes }) =>
    state.moment === 'goal' ? { ...state, moment: 'modality', goalMinutes: minutes } : state,
  back,
  start: (state, { now }) => start(state, now),
  pause: (state, { now }) => pause(state, now),
  resume: (state, { now }) => resume(state, now),
  lap: (state, { now, distanceMeters }) => lap(state, now, distanceMeters),
  tick: (state, { now }) => tick(state, now),
  openRoute: (state) => (isRunning(state) ? { ...state, routeOpen: true } : state),
  closeRoute: (state) => (state.routeOpen ? { ...state, routeOpen: false } : state),
  finish: (state, { now }) => finish(state, now),
  saved: (state) => (state.moment === 'feedback' ? { ...state, moment: 'summary' } : state),
  discard: (state) => (state.moment === 'feedback' ? initialCardioSession() : state),
  // Só do resumo: a sessão já está gravada. No meio dela, recomeçar apagaria o
  // que foi medido sem a pergunta do "Sair sem salvar?".
  restart: (state) => (state.moment === 'summary' ? initialCardioSession() : state),
};

function applyTransition<T extends ActionType>(
  state: CardioSessionState,
  action: ActionOf<T>
): CardioSessionState {
  return TRANSITIONS[action.type](state, action);
}

/**
 * Transição de estado. Ação que não cabe no momento atual devolve o mesmo estado.
 *
 * @example transitionCardio(session, { type: 'start', now: Date.now() })
 */
export function transitionCardio(
  state: CardioSessionState,
  action: CardioAction
): CardioSessionState {
  return applyTransition(state, action);
}
