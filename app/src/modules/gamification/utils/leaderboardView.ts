import type { LeaderboardEntry } from '@elevapro/shared';

/** A RPC devolve os 50 primeiros e, depois deles, a linha de quem consulta. */
export const TOP_SIZE = 50;

export interface PodiumSlot {
  /** O degrau: define a altura, não o número mostrado. */
  step: 1 | 2 | 3;
  entry: LeaderboardEntry | null;
}

export interface LeaderboardView {
  /** Na ordem do desenho: 2º, 1º e 3º. */
  podium: PodiumSlot[];
  rows: LeaderboardEntry[];
  /** A linha do usuário quando ele ficou fora dos 50 primeiros. */
  ownRowOutside: LeaderboardEntry | null;
  /** Ninguém pontuou: o placar de alunos traz todos, mesmo com zero. */
  isEmpty: boolean;
}

/**
 * Reparte o placar entre pódio e classificação.
 *
 * Só sobe ao pódio quem pontuou: o placar do especialista lista todos os alunos,
 * e um pódio de zeros premiaria a ordem alfabética.
 *
 * @example const { podium, rows } = buildLeaderboardView(entries);
 */
export function buildLeaderboardView(entries: LeaderboardEntry[]): LeaderboardView {
  const top = entries.slice(0, TOP_SIZE);
  const podiumCount = Math.min(3, top.filter((entry) => entry.points > 0).length);
  const onStep = (index: number) => (index < podiumCount ? (top[index] ?? null) : null);

  return {
    podium: [
      { step: 2, entry: onStep(1) },
      { step: 1, entry: onStep(0) },
      { step: 3, entry: onStep(2) },
    ],
    rows: top.slice(podiumCount),
    ownRowOutside: entries[TOP_SIZE] ?? null,
    isEmpty: podiumCount === 0,
  };
}

export interface RankChange {
  tone: 'up' | 'down' | 'same' | 'new';
  label: string;
}

/**
 * Quantas posições a pessoa ganhou desde a semana passada.
 *
 * @example rankChange({ ...entry, rank: 4, previousRank: 6 }) // { tone: 'up', label: '+2' }
 */
export function rankChange({ rank, previousRank }: LeaderboardEntry): RankChange {
  if (previousRank === null) return { tone: 'new', label: 'novo' };
  const gained = previousRank - rank;
  if (gained > 0) return { tone: 'up', label: `+${gained}` };
  if (gained < 0) return { tone: 'down', label: String(gained) };
  return { tone: 'same', label: '0' };
}

/**
 * A letra do círculo no lugar da foto, que o placar não recebe.
 *
 * @example initialOf('Ana C.') // "A"
 */
export function initialOf(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?';
}
