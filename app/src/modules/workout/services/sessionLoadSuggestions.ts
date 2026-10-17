import {
  type ExerciseEffort,
  type ExerciseHistoryEntry,
  type LoadSuggestion,
  numeroDaPrescricao,
  type SerieFeita,
  suggestLoad,
  type WorkoutExercise,
} from '@elevapro/shared';
import { suggestedWeightText } from './loadSuggestionCopy';

export type ExerciseHistory = Record<string, ExerciseHistoryEntry[]>;
export type LoadSuggestions = Record<string, LoadSuggestion>;

/** As semanas especiais do plano: descarga (A7) e retorno do Modo Descanso (A8). */
export interface WeekKind {
  deload: boolean;
  returnWeek: boolean;
}

const NORMAL_WEEK: WeekKind = { deload: false, returnWeek: false };

function suggestionFor(
  item: WorkoutExercise,
  history: ExerciseHistoryEntry[],
  week: WeekKind = NORMAL_WEEK
): LoadSuggestion {
  return suggestLoad({
    prescribedWeight: numeroDaPrescricao(item.weight),
    prescribedReps: item.reps ?? null,
    history,
    ...week,
  });
}

/**
 * As cargas de hoje (A1): a sugestão de cada exercício pelo que a pessoa
 * sentiu nas últimas sessões. Na semana de descarga, a carga fica a mesma; na
 * de retorno do Modo Descanso, cai para reacostumar.
 *
 * @example const hoje = todaySuggestions(treino.exercises, historico, { deload: false, returnWeek: false });
 */
export function todaySuggestions(
  items: readonly WorkoutExercise[],
  history: ExerciseHistory,
  week: WeekKind
): LoadSuggestions {
  return Object.fromEntries(
    items.map((item) => [item.id, suggestionFor(item, history[item.id] ?? [], week)])
  );
}

/**
 * Na próxima vez (A3): a sessão que acabou entra na frente do histórico, e a
 * regra lê as duas como lerá no próximo pré-início. Só o que foi feito hoje —
 * exercício pulado não tem o que sugerir.
 *
 * @example const proxima = nextTimeSuggestions(sessao.itens, sessao.feitas, sessao.efforts, historico);
 */
export function nextTimeSuggestions(
  items: readonly WorkoutExercise[],
  done: Record<string, SerieFeita[]>,
  efforts: Record<string, ExerciseEffort>,
  history: ExerciseHistory
): LoadSuggestions {
  const doneToday = items.filter((item) => (done[item.id]?.length ?? 0) > 0);
  return Object.fromEntries(
    doneToday.map((item) => {
      const today = { maxWeightKg: maxWeight(done[item.id]), effort: efforts[item.id] ?? null };
      return [item.id, suggestionFor(item, [today, ...(history[item.id] ?? [])])];
    })
  );
}

function maxWeight(series: readonly SerieFeita[]): number {
  return Math.max(0, ...series.map((serie) => serie.carga ?? 0));
}

/**
 * A carga que a sessão de hoje usa, por exercício: só onde a sugestão tem
 * carga e ela difere da prescrição.
 *
 * @example despachar({ tipo: 'applySuggestedLoads', weights: weightsToApply(itens, hoje) });
 */
export function weightsToApply(
  items: readonly WorkoutExercise[],
  suggestions: LoadSuggestions
): Record<string, string> {
  const weights: Record<string, string> = {};
  for (const item of items) {
    const suggestion = suggestions[item.id];
    const weight = suggestion ? suggestedWeightText(suggestion) : null;
    if (weight && weight !== item.weight) weights[item.id] = weight;
  }
  return weights;
}
