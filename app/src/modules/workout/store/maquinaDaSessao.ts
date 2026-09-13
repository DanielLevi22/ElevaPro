import { numeroDaPrescricao, type SerieFeita, type WorkoutExercise } from '@elevapro/shared';
import { DEFAULT_REST_TIME } from '../constants';

/**
 * A sessão de treino como uma sequência de estados, do jeito que o kit a
 * desenha: pré-início → execução ⇄ descanso → feedback → resumo.
 *
 * A tela antiga era um estado só com cinco modais pendurados, e cada modal
 * decidia sozinho quando abrir. Aqui cada transição é explícita e pura — dá
 * para testar a sessão inteira sem montar tela nenhuma —, e cada etapa desenha
 * a sua tela.
 *
 * O tempo entra como `agora` em cada ação, e o estado guarda instantes, não
 * contagens. Um `setInterval` que soma 1 perde tempo toda vez que o sistema
 * suspende o app; um instante relido no tique já volta do background certo.
 */
export type Etapa = 'preInicio' | 'execucao' | 'descanso' | 'feedback' | 'resumo';

export interface Descanso {
  /** Segundos do intervalo; cresce com +15 s, não encolhe com −15 s. */
  total: number;
  terminaEm: number;
  /** Segundos que faltavam quando pausou. Nulo enquanto corre. */
  pausadoCom: number | null;
}

export interface EstadoDaSessao {
  etapa: Etapa;
  /** Os exercícios com o que o aluno ajustou durante a sessão. */
  itens: WorkoutExercise[];
  atualId: string | null;
  feitas: Record<string, SerieFeita[]>;
  iniciadaEm: number | null;
  concluidaEm: number | null;
  descanso: Descanso | null;
  /** A série registrada por último — o resumo do descanso. */
  ultima: SerieFeita | null;
}

export type AcaoDaSessao =
  | { tipo: 'iniciar'; agora: number }
  | { tipo: 'check'; agora: number }
  | { tipo: 'escolher'; itemId: string }
  | { tipo: 'ajustarExercicio'; item: WorkoutExercise }
  | { tipo: 'ajustarDescanso'; segundos: number; agora: number }
  | { tipo: 'pausarDescanso'; agora: number }
  | { tipo: 'retomarDescanso'; agora: number }
  | { tipo: 'terminarDescanso' }
  | { tipo: 'tique'; agora: number }
  | { tipo: 'finalizar'; agora: number }
  | { tipo: 'voltarAoTreino' }
  | { tipo: 'salva' };

const MS = 1000;

/**
 * @example
 * const [sessao, despachar] = useReducer(transicionar, treino.exercises ?? [], estadoInicial);
 */
export function estadoInicial(itens: WorkoutExercise[]): EstadoDaSessao {
  return {
    etapa: 'preInicio',
    itens,
    atualId: itens[0]?.id ?? null,
    feitas: {},
    iniciadaEm: null,
    concluidaEm: null,
    descanso: null,
    ultima: null,
  };
}

/** Transição de estado. Ação que não cabe na etapa atual devolve o mesmo estado. */
export function transicionar(estado: EstadoDaSessao, acao: AcaoDaSessao): EstadoDaSessao {
  switch (acao.tipo) {
    case 'iniciar':
      return estado.etapa === 'preInicio'
        ? { ...estado, etapa: 'execucao', iniciadaEm: acao.agora }
        : estado;
    case 'check':
      return estado.etapa === 'execucao' ? registrarSerie(estado, acao.agora) : estado;
    case 'escolher':
      return { ...estado, atualId: acao.itemId };
    case 'ajustarExercicio':
      return {
        ...estado,
        itens: estado.itens.map((i) => (i.id === acao.item.id ? acao.item : i)),
      };
    case 'ajustarDescanso':
      return ajustarDescanso(estado, acao.segundos, acao.agora);
    case 'pausarDescanso':
      return pausarDescanso(estado, acao.agora);
    case 'retomarDescanso':
      return retomarDescanso(estado, acao.agora);
    case 'terminarDescanso':
      return estado.etapa === 'descanso' ? paraExecucao(estado) : estado;
    case 'tique':
      return estado.etapa === 'descanso' && restanteDoDescanso(estado, acao.agora) === 0
        ? paraExecucao(estado)
        : estado;
    case 'finalizar':
      return { ...estado, etapa: 'feedback', concluidaEm: acao.agora, descanso: null };
    case 'voltarAoTreino':
      return estado.etapa === 'feedback'
        ? { ...estado, etapa: 'execucao', concluidaEm: null }
        : estado;
    case 'salva':
      return estado.etapa === 'feedback' ? { ...estado, etapa: 'resumo' } : estado;
  }
}

function paraExecucao(estado: EstadoDaSessao): EstadoDaSessao {
  return { ...estado, etapa: 'execucao', descanso: null };
}

function seriesDo(item: WorkoutExercise): number {
  return item.sets ?? 0;
}

function feitasDo(estado: EstadoDaSessao, itemId: string): number {
  return estado.feitas[itemId]?.length ?? 0;
}

function registrarSerie(estado: EstadoDaSessao, agora: number): EstadoDaSessao {
  const item = estado.itens.find((i) => i.id === estado.atualId);
  if (!item || feitasDo(estado, item.id) >= seriesDo(item)) return estado;

  const serie: SerieFeita = {
    reps: numeroDaPrescricao(item.reps),
    carga: numeroDaPrescricao(item.weight),
  };
  const feitas = { ...estado.feitas, [item.id]: [...(estado.feitas[item.id] ?? []), serie] };
  const depois = {
    ...estado,
    feitas,
    ultima: serie,
    atualId: proximoIncompleto({ ...estado, feitas }, item.id),
  };

  if (depois.atualId === null) {
    return { ...depois, etapa: 'feedback', concluidaEm: agora, descanso: null };
  }
  const descanso = item.rest_seconds ?? DEFAULT_REST_TIME;
  if (descanso <= 0) return depois;
  return {
    ...depois,
    etapa: 'descanso',
    descanso: { total: descanso, terminaEm: agora + descanso * MS, pausadoCom: null },
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
  return emOrdem.find((i) => feitasDo(estado, i.id) < seriesDo(i))?.id ?? null;
}

function ajustarDescanso(estado: EstadoDaSessao, segundos: number, agora: number): EstadoDaSessao {
  if (estado.etapa !== 'descanso' || !estado.descanso) return estado;
  const restante = Math.max(0, restanteDoDescanso(estado, agora) + segundos);
  if (restante === 0) return paraExecucao(estado);

  const { descanso } = estado;
  return {
    ...estado,
    descanso: {
      total: Math.max(descanso.total, restante),
      terminaEm: agora + restante * MS,
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
    descanso: { ...estado.descanso, terminaEm: agora + pausadoCom * MS, pausadoCom: null },
  };
}

/** Segundos que faltam do descanso, arredondados para cima. Zero fora dele. */
export function restanteDoDescanso(estado: EstadoDaSessao, agora: number): number {
  const { descanso } = estado;
  if (!descanso || estado.etapa !== 'descanso') return 0;
  if (descanso.pausadoCom !== null) return descanso.pausadoCom;
  return Math.max(0, Math.ceil((descanso.terminaEm - agora) / MS));
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

/** A série que vem agora — o "A seguir" do descanso. */
export function proximaSerie(
  estado: EstadoDaSessao
): { item: WorkoutExercise; numero: number } | null {
  const item = estado.itens.find((i) => i.id === estado.atualId);
  return item ? { item, numero: feitasDo(estado, item.id) + 1 } : null;
}

/** Quantas séries do exercício já foram feitas. */
export function seriesFeitasDo(estado: EstadoDaSessao, itemId: string): number {
  return feitasDo(estado, itemId);
}
