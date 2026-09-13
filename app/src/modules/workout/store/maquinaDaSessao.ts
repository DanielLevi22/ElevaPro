import {
  MS_POR_SEGUNDO,
  numeroDaPrescricao,
  type SerieFeita,
  type WorkoutExercise,
} from '@elevapro/shared';
import { DEFAULT_REST_TIME } from '../constants';
import {
  type Cronometro,
  cronometroParado,
  pausarCronometro,
  segundosDoCronometro,
  soltarCronometro,
} from './cronometro';

/**
 * A sessão de treino como uma sequência de estados:
 *
 *     pré-início → execução → série ⇄ descanso → execução … → feedback → resumo
 *
 * - **execução** é a lista: o que foi feito, o exercício atual e o que vem;
 * - **série** é o cronômetro do exercício. Abre parado em 00:00 e só conta
 *   quando o aluno aperta o play; "Concluir" registra a série;
 * - **descanso** começa sozinho quando a série termina, e volta à execução
 *   quando o tempo acaba.
 *
 * Cada transição é explícita e pura — dá para testar a sessão inteira sem
 * montar tela nenhuma. O tempo entra como `agora` em cada ação, e o estado
 * guarda instantes, não contagens: um `setInterval` que soma 1 perde tempo toda
 * vez que o sistema suspende o app, e um instante relido volta do background
 * certo.
 */
export type Momento = 'preInicio' | 'execucao' | 'serie' | 'descanso' | 'feedback' | 'resumo';

export interface Descanso {
  /** Segundos do intervalo; cresce com +15 s, não encolhe com −15 s. */
  total: number;
  terminaEm: number;
  /** Segundos que faltavam quando pausou. Nulo enquanto corre. */
  pausadoCom: number | null;
}

export interface EstadoDaSessao {
  momento: Momento;
  /** Os exercícios com o que o aluno ajustou durante a sessão. */
  itens: WorkoutExercise[];
  atualId: string | null;
  feitas: Record<string, SerieFeita[]>;
  iniciadaEm: number | null;
  concluidaEm: number | null;
  /** O tempo do exercício da série aberta. Nulo fora do momento `serie`. */
  serie: Cronometro | null;
  descanso: Descanso | null;
  /** A série registrada por último — o resumo do descanso. */
  ultima: SerieFeita | null;
  /** Quanto a última série levou, em segundos. Mostrado, não gravado. */
  duracaoDaUltima: number | null;
}

type SemDados = Record<never, never>;

/** O que cada ação carrega além do tipo. As que mudam o tempo levam `agora`. */
interface DadosDasAcoes {
  iniciar: { agora: number };
  abrirSerie: SemDados;
  alternarSerie: { agora: number };
  zerarSerie: SemDados;
  concluirSerie: { agora: number };
  fecharSerie: SemDados;
  escolher: { itemId: string };
  ajustarExercicio: { item: WorkoutExercise };
  ajustarDescanso: { segundos: number; agora: number };
  alternarDescanso: { agora: number };
  pausarDescanso: { agora: number };
  retomarDescanso: { agora: number };
  terminarDescanso: SemDados;
  tique: { agora: number };
  finalizar: { agora: number };
  voltarAoTreino: SemDados;
  salva: SemDados;
}

type TipoDaAcao = keyof DadosDasAcoes;
type AcaoDo<T extends TipoDaAcao> = { tipo: T } & DadosDasAcoes[T];

export type AcaoDaSessao = { [T in TipoDaAcao]: AcaoDo<T> }[TipoDaAcao];

/**
 * @example
 * const [sessao, despachar] = useReducer(transicionar, treino.exercises ?? [], estadoInicial);
 */
export function estadoInicial(itens: WorkoutExercise[]): EstadoDaSessao {
  return {
    momento: 'preInicio',
    itens,
    atualId: itens[0]?.id ?? null,
    feitas: {},
    iniciadaEm: null,
    concluidaEm: null,
    serie: null,
    descanso: null,
    ultima: null,
    duracaoDaUltima: null,
  };
}

/**
 * Se o treino está correndo: da execução ao descanso. É quando o relógio bate
 * e a voz escuta; antes o aluno não começou, e depois só falta o feedback.
 *
 * @example emAndamento(sessao.momento) // true na série
 */
export function emAndamento(momento: Momento): boolean {
  return momento === 'execucao' || momento === 'serie' || momento === 'descanso';
}

/**
 * Transição de estado. Ação que não cabe no momento atual devolve o mesmo estado.
 *
 * @example transicionar(estado, { tipo: 'concluirSerie', agora: Date.now() })
 */
export function transicionar(estado: EstadoDaSessao, acao: AcaoDaSessao): EstadoDaSessao {
  return aplicarTransicao(estado, acao);
}

function aplicarTransicao<T extends TipoDaAcao>(
  estado: EstadoDaSessao,
  acao: AcaoDo<T>
): EstadoDaSessao {
  return TRANSICOES[acao.tipo](estado, acao);
}

/** Uma função por ação: a tabela é o mapa inteiro da máquina. */
const TRANSICOES: {
  [T in TipoDaAcao]: (estado: EstadoDaSessao, acao: AcaoDo<T>) => EstadoDaSessao;
} = {
  iniciar: (estado, { agora }) =>
    estado.momento === 'preInicio' ? { ...estado, momento: 'execucao', iniciadaEm: agora } : estado,
  abrirSerie: (estado) => abrirSerie(estado),
  alternarSerie: (estado, { agora }) => noCronometroDaSerie(estado, (s) => alternar(s, agora)),
  zerarSerie: (estado) => noCronometroDaSerie(estado, cronometroParado),
  fecharSerie: (estado) => (estado.momento === 'serie' ? paraExecucao(estado) : estado),
  concluirSerie: (estado, { agora }) => concluirSerie(estado, agora),
  escolher: (estado, { itemId }) => escolher(estado, itemId),
  ajustarExercicio: (estado, { item }) => ({
    ...estado,
    itens: estado.itens.map((i) => (i.id === item.id ? item : i)),
  }),
  ajustarDescanso: (estado, { segundos, agora }) => ajustarDescanso(estado, segundos, agora),
  alternarDescanso: (estado, { agora }) =>
    estado.descanso?.pausadoCom === null
      ? pausarDescanso(estado, agora)
      : retomarDescanso(estado, agora),
  pausarDescanso: (estado, { agora }) => pausarDescanso(estado, agora),
  retomarDescanso: (estado, { agora }) => retomarDescanso(estado, agora),
  terminarDescanso: (estado) => (estado.momento === 'descanso' ? paraExecucao(estado) : estado),
  tique: (estado, { agora }) =>
    estado.momento === 'descanso' && restanteDoDescanso(estado, agora) === 0
      ? paraExecucao(estado)
      : estado,
  finalizar: (estado, { agora }) => finalizar(estado, agora),
  voltarAoTreino: (estado) =>
    estado.momento === 'feedback' ? { ...estado, momento: 'execucao', concluidaEm: null } : estado,
  salva: (estado) => (estado.momento === 'feedback' ? { ...estado, momento: 'resumo' } : estado),
};

function paraExecucao(estado: EstadoDaSessao): EstadoDaSessao {
  return { ...estado, momento: 'execucao', serie: null, descanso: null };
}

function seriesDo(item: WorkoutExercise): number {
  return item.sets ?? 0;
}

function feitasDo(estado: EstadoDaSessao, itemId: string): number {
  return estado.feitas[itemId]?.length ?? 0;
}

function itemAtual(estado: EstadoDaSessao): WorkoutExercise | undefined {
  return estado.itens.find((i) => i.id === estado.atualId);
}

/** Abre o cronômetro da série atual, parado: o tempo só conta no play. */
function abrirSerie(estado: EstadoDaSessao): EstadoDaSessao {
  const item = itemAtual(estado);
  if (estado.momento !== 'execucao' || !item || exercicioConcluido(estado, item)) {
    return estado;
  }
  return { ...estado, momento: 'serie', serie: cronometroParado() };
}

function noCronometroDaSerie(
  estado: EstadoDaSessao,
  mudar: (serie: Cronometro) => Cronometro
): EstadoDaSessao {
  if (estado.momento !== 'serie' || !estado.serie) return estado;
  return { ...estado, serie: mudar(estado.serie) };
}

function alternar(serie: Cronometro, agora: number): Cronometro {
  return serie.desde === null ? soltarCronometro(serie, agora) : pausarCronometro(serie, agora);
}

/**
 * Troca o exercício atual pela lista. Só na execução, e só para um exercício
 * com série por fazer: escolher um já concluído deixaria o cartão em execução
 * sem série para abrir.
 */
function escolher(estado: EstadoDaSessao, itemId: string): EstadoDaSessao {
  const item = estado.itens.find((i) => i.id === itemId);
  if (estado.momento !== 'execucao' || !item || exercicioConcluido(estado, item)) return estado;
  return { ...estado, atualId: itemId };
}

/** Encerra antes da hora, vindo de qualquer momento do treino correndo. */
function finalizar(estado: EstadoDaSessao, agora: number): EstadoDaSessao {
  if (!emAndamento(estado.momento)) return estado;
  return { ...estado, momento: 'feedback', concluidaEm: agora, serie: null, descanso: null };
}

/**
 * Registra a série atual e começa o descanso na hora. A voz ("feito") conclui
 * também da lista, sem ter aberto o cronômetro — aí a série fica sem duração.
 */
function concluirSerie(estado: EstadoDaSessao, agora: number): EstadoDaSessao {
  if (estado.momento !== 'serie' && estado.momento !== 'execucao') return estado;
  const item = itemAtual(estado);
  if (!item || exercicioConcluido(estado, item)) return estado;

  const serie: SerieFeita = {
    reps: numeroDaPrescricao(item.reps),
    carga: numeroDaPrescricao(item.weight),
  };
  const feitas = { ...estado.feitas, [item.id]: [...(estado.feitas[item.id] ?? []), serie] };
  const depois: EstadoDaSessao = {
    ...estado,
    feitas,
    ultima: serie,
    duracaoDaUltima: estado.serie ? segundosDoCronometro(estado.serie, agora) : null,
    serie: null,
    atualId: proximoIncompleto({ ...estado, feitas }, item.id),
  };

  if (depois.atualId === null) {
    return { ...depois, momento: 'feedback', concluidaEm: agora, descanso: null };
  }
  const descanso = item.rest_seconds ?? DEFAULT_REST_TIME;
  if (descanso <= 0) return paraExecucao(depois);
  return {
    ...depois,
    momento: 'descanso',
    descanso: { total: descanso, terminaEm: agora + descanso * MS_POR_SEGUNDO, pausadoCom: null },
  };
}

/**
 * O exercício que vem agora: o mesmo, se ainda tem série; senão o próximo da
 * lista com série pendente, dando a volta — quem pulou um exercício volta a
 * ele no fim. Nulo quando tudo foi feito.
 */
function proximoIncompleto(estado: EstadoDaSessao, aPartirDe: string): string | null {
  const indice = estado.itens.findIndex((i) => i.id === aPartirDe);
  const emOrdem = [...estado.itens.slice(indice), ...estado.itens.slice(0, indice)];
  return emOrdem.find((i) => !exercicioConcluido(estado, i))?.id ?? null;
}

function ajustarDescanso(estado: EstadoDaSessao, segundos: number, agora: number): EstadoDaSessao {
  if (estado.momento !== 'descanso' || !estado.descanso) return estado;
  const restante = Math.max(0, restanteDoDescanso(estado, agora) + segundos);
  if (restante === 0) return paraExecucao(estado);

  const { descanso } = estado;
  return {
    ...estado,
    descanso: {
      total: Math.max(descanso.total, restante),
      terminaEm: agora + restante * MS_POR_SEGUNDO,
      pausadoCom: descanso.pausadoCom === null ? null : restante,
    },
  };
}

function pausarDescanso(estado: EstadoDaSessao, agora: number): EstadoDaSessao {
  if (!estado.descanso || estado.descanso.pausadoCom !== null) return estado;
  return {
    ...estado,
    descanso: { ...estado.descanso, pausadoCom: restanteDoDescanso(estado, agora) },
  };
}

function retomarDescanso(estado: EstadoDaSessao, agora: number): EstadoDaSessao {
  const pausadoCom = estado.descanso?.pausadoCom;
  if (!estado.descanso || pausadoCom === null || pausadoCom === undefined) return estado;
  return {
    ...estado,
    descanso: {
      ...estado.descanso,
      terminaEm: agora + pausadoCom * MS_POR_SEGUNDO,
      pausadoCom: null,
    },
  };
}

/** Segundos que faltam do descanso, arredondados para cima. Zero fora dele. */
export function restanteDoDescanso(estado: EstadoDaSessao, agora: number): number {
  const { descanso } = estado;
  if (!descanso || estado.momento !== 'descanso') return 0;
  if (descanso.pausadoCom !== null) return descanso.pausadoCom;
  return Math.max(0, Math.ceil((descanso.terminaEm - agora) / MS_POR_SEGUNDO));
}

/**
 * Segundos desde o início do treino — o "18:24" do topo.
 *
 * @example formatarDuracao(tempoDaSessao(sessao, agora)) // "18:24"
 */
export function tempoDaSessao(estado: EstadoDaSessao, agora: number): number {
  return estado.iniciadaEm === null ? 0 : (agora - estado.iniciadaEm) / MS_POR_SEGUNDO;
}

/** Segundos do exercício na série aberta. Zero fora dela. */
export function tempoDaSerie(estado: EstadoDaSessao, agora: number): number {
  return estado.serie ? segundosDoCronometro(estado.serie, agora) : 0;
}

export interface ProgressoDaSessao {
  /** Posição do exercício atual, a partir de 1. */
  exercicio: number;
  exercicios: number;
  seriesFeitas: number;
  seriesTotais: number;
}

/** "Exercício 2 de 6 · 8 de 22 séries". */
export function progressoDaSessao(estado: EstadoDaSessao): ProgressoDaSessao {
  const indice = estado.itens.findIndex((i) => i.id === estado.atualId);
  return {
    exercicio: indice === -1 ? estado.itens.length : indice + 1,
    exercicios: estado.itens.length,
    seriesFeitas: Object.values(estado.feitas).reduce((soma, s) => soma + s.length, 0),
    seriesTotais: estado.itens.reduce((soma, i) => soma + seriesDo(i), 0),
  };
}

/** A série que vem agora — o "A seguir" do descanso e o título do cronômetro. */
export function proximaSerie(
  estado: EstadoDaSessao
): { item: WorkoutExercise; numero: number } | null {
  const item = itemAtual(estado);
  return item ? { item, numero: feitasDo(estado, item.id) + 1 } : null;
}

/**
 * Se todas as séries prescritas do exercício já foram feitas — o que separa
 * "Concluídos" de "A seguir" na lista.
 *
 * @example exercicioConcluido(sessao, item) // true depois da última série
 */
export function exercicioConcluido(estado: EstadoDaSessao, item: WorkoutExercise): boolean {
  return feitasDo(estado, item.id) >= seriesDo(item);
}
