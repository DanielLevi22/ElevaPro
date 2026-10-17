import type { ActionableNoticeKind } from '@elevapro/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

/** O aviso com ação de uma refeição ou de um treino, como chave: "meal:almoco". */
export type NoticeRefKey = `${ActionableNoticeKind}:${string}`;

/**
 * A chave do aviso de um item.
 *
 * @example refKeyOf('meal', 'almoco') // "meal:almoco"
 */
export function refKeyOf(kind: ActionableNoticeKind, id: string): NoticeRefKey {
  return `${kind}:${id}`;
}

/** O tipo e o item de uma chave. @example refOf('meal:almoco') // { kind: 'meal', id: 'almoco' } */
export function refOf(key: NoticeRefKey): { kind: ActionableNoticeKind; id: string } {
  const [kind, ...rest] = key.split(':');
  return { kind: kind as ActionableNoticeKind, id: rest.join(':') };
}

/** A resposta à pergunta do aviso ignorado (E6). */
export type IgnoredChoice = 'later' | 'mute' | 'keep';

/** Um aviso agendado, lembrado para saber depois se foi ignorado (E6). */
export interface TrackedNotice {
  id: string;
  refKey: NoticeRefKey;
  /** O nome que a pergunta do E6 usa: "almoço", "treino". */
  label: string;
  /** Quando toca, em ms. */
  at: number;
}

export interface IgnoredCount {
  count: number;
  label: string;
}

/** A partir de quantos avisos ignorados seguidos o app pergunta (E6). */
export const IGNORED_TO_ASK = 3;

export interface NoticeChoices {
  /** O dia a que os "pulei" e "hoje não" se referem. */
  day: string;
  skippedMeals: string[];
  skippedWorkout: boolean;
  /** O treino movido para amanhã (E3). */
  movedWorkout: { date: string; id: string } | null;
  /** As refeições cujo aviso a pessoa parou (E6). */
  mutedMeals: string[];
  /** Minutos a mais no aviso de cada refeição (E6, "outro horário"). */
  mealDelays: Record<string, number>;
}

interface NoticeChoicesState extends NoticeChoices {
  scheduled: TrackedNotice[];
  responded: string[];
  /** Quantas vezes seguidas cada aviso tocou sem resposta, com o nome dele. */
  ignored: Partial<Record<NoticeRefKey, IgnoredCount>>;
  skipMeal: (day: string, mealId: string) => void;
  skipWorkout: (day: string) => void;
  moveWorkout: (today: string, moved: NonNullable<NoticeChoices['movedWorkout']>) => void;
  respond: (noticeId: string) => void;
  settle: (now: number, done: readonly NoticeRefKey[], next: TrackedNotice[]) => void;
  resolveIgnored: (refKey: NoticeRefKey, change: IgnoredChoice) => void;
  /** Ao sair da conta: as escolhas eram da pessoa que saiu. */
  reset: () => void;
}

const RESPONDED_KEPT = 60;
const LATER_MINUTES = 60;

const EMPTY_CHOICES = {
  day: '',
  skippedMeals: [],
  skippedWorkout: false,
  movedWorkout: null,
  mutedMeals: [],
  mealDelays: {},
  scheduled: [],
  responded: [],
  ignored: {},
};

/** O "pulei" de ontem não vale hoje: o dia muda e as escolhas do dia somem. */
const ofDay = (state: NoticeChoices, day: string) =>
  state.day === day ? state : { day, skippedMeals: [], skippedWorkout: false };

/**
 * O que a pessoa respondeu nos avisos, só no aparelho: o que pulou hoje, o
 * treino movido, as refeições sem aviso e quantas vezes cada aviso foi
 * ignorado. Só ids, nomes de refeição e horários; nada do que foi comido.
 *
 * @example useNoticeChoicesStore.getState().skipMeal('2026-10-14', almoco.id);
 */
export const useNoticeChoicesStore = create<NoticeChoicesState>()(
  persist(
    (set) => ({
      ...EMPTY_CHOICES,
      reset: () => set(EMPTY_CHOICES),
      skipMeal: (day, mealId) =>
        set((state) => {
          const today = ofDay(state, day);
          return { ...today, skippedMeals: [...(today.skippedMeals ?? []), mealId] };
        }),
      skipWorkout: (day) => set((state) => ({ ...ofDay(state, day), skippedWorkout: true })),
      moveWorkout: (today, moved) =>
        set((state) => ({ ...ofDay(state, today), skippedWorkout: true, movedWorkout: moved })),
      respond: (noticeId) =>
        set((state) => ({ responded: [noticeId, ...state.responded].slice(0, RESPONDED_KEPT) })),
      settle: (now, done, next) => set((state) => settleIgnored(state, now, done, next)),
      resolveIgnored: (refKey, change) => set((state) => resolve(state, refKey, change)),
    }),
    {
      name: 'notice-choices',
      storage: createJSONStorage(() => armazenamentoNoAparelho('notice-choices')),
    }
  )
);

/**
 * Os avisos que já tocaram: com resposta, ou com a coisa feita depois, zeram a
 * conta; sem nenhum dos dois, somam um. Os que ainda vão tocar ficam para a
 * próxima vez.
 */
function settleIgnored(
  state: NoticeChoicesState,
  now: number,
  done: readonly NoticeRefKey[],
  next: TrackedNotice[]
): Partial<NoticeChoicesState> {
  const ignored = { ...state.ignored };
  for (const notice of state.scheduled.filter((item) => item.at <= now)) {
    const answered = state.responded.includes(notice.id) || done.includes(notice.refKey);
    const count = answered ? 0 : (ignored[notice.refKey]?.count ?? 0) + 1;
    ignored[notice.refKey] = { count, label: notice.label };
  }
  return { ignored, scheduled: next };
}

function resolve(
  state: NoticeChoicesState,
  refKey: NoticeRefKey,
  change: IgnoredChoice
): Partial<NoticeChoicesState> {
  const { [refKey]: _answered, ...ignored } = state.ignored;
  const { kind, id } = refOf(refKey);
  if (kind !== 'meal' || change === 'keep') return { ignored };
  if (change === 'mute') return { ignored, mutedMeals: [...state.mutedMeals, id] };
  return {
    ignored,
    mealDelays: { ...state.mealDelays, [id]: (state.mealDelays[id] ?? 0) + LATER_MINUTES },
  };
}
