import { type BlockComparison, contagem } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';

export interface ComparisonRow {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  before: string;
  after: string;
  badge: string;
}

const MAX_LISTED = 3;

const LEVELS: Record<string, string> = {
  beginner: 'Iniciante',
  returning: 'Voltando',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const dayDelta = (delta: number) => signed(delta, Math.abs(delta) === 1 ? 'dia' : 'dias');

const signed = (delta: number, unit: string) =>
  delta === 0
    ? 'igual'
    : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('pt-BR')} ${unit}`;

/**
 * As linhas "antes → depois" da B5: dias, exercícios novos e a meta. A meta só
 * aparece quando há dieta dos dois lados.
 *
 * @example comparisonRows(comparacao)[0] // { title: 'Dias por semana', before: '3', after: '4', badge: '+1 dia' }
 */
export function comparisonRows(comparison: BlockComparison): ComparisonRow[] {
  const { trainingDays, newExercises, calories, level } = comparison;
  const rows: ComparisonRow[] = [
    ...(level
      ? [
          {
            icon: 'trending-up-outline' as const,
            title: 'Nível',
            before: LEVELS[level.before] ?? level.before,
            after: LEVELS[level.after] ?? level.after,
            badge: 'novo',
          },
        ]
      : []),
    {
      icon: 'calendar-outline',
      title: 'Dias por semana',
      before: String(trainingDays.before),
      after: String(trainingDays.after),
      badge: dayDelta(trainingDays.after - trainingDays.before),
    },
    {
      icon: 'barbell-outline',
      title: 'Exercícios novos',
      before: '—',
      after: listed(newExercises),
      badge: newExercises.length > 0 ? `+${newExercises.length}` : 'nenhum',
    },
  ];
  if (calories.before !== null && calories.after !== null) {
    rows.push({
      icon: 'flag-outline',
      title: 'Meta diária',
      before: `${calories.before.toLocaleString('pt-BR')} kcal`,
      after: `${calories.after.toLocaleString('pt-BR')} kcal`,
      badge: signed(calories.after - calories.before, 'kcal'),
    });
  }
  return rows;
}

function listed(names: readonly string[]): string {
  if (names.length === 0) return 'os mesmos';
  const shown = names.slice(0, MAX_LISTED).join(', ');
  return names.length > MAX_LISTED ? `${shown} e mais ${names.length - MAX_LISTED}` : shown;
}

/**
 * O que continua, para a pessoa saber que o bloco novo não recomeça do zero.
 *
 * @example keptNote({ keptExercises: 5, … }) // "Continuam 5 exercícios do bloco anterior, com as cargas que você conquistou."
 */
export function keptNote(comparison: BlockComparison): string {
  if (comparison.keptExercises === 0) {
    return 'Os exercícios mudam, e as cargas partem do que você já levanta.';
  }
  return `Continuam ${contagem(comparison.keptExercises, 'exercício', 'exercícios')} do bloco anterior, com as cargas que você conquistou.`;
}
