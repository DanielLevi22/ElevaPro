import { formatarCarga, formatarDecimal, type LoadSuggestion } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';

export interface LoadSuggestionCopy {
  /** O selo: "+2,5 kg", "Mantém", "−2 kg", "+1 repetição". */
  badge: string;
  /** Por que: "foi fácil da última vez". */
  reason: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** A carga em texto, para a tela: "12,5 kg"; nulo sem carga. */
  weight: string | null;
}

const REASON: Record<LoadSuggestion['reason'], string> = {
  no_history: 'primeira vez neste treino',
  no_answer: 'a mesma da última vez',
  ok: 'tente mais repetições',
  hard_once: 'foi difícil da última vez',
  deload: 'semana de descarga',
  return: 'semana de retorno',
  hard_twice: 'difícil duas vezes seguidas',
  easy: 'foi fácil da última vez',
};

/**
 * O texto da carga sugerida (A1 e A3 do kit): o selo, o motivo e a carga.
 *
 * @example loadSuggestionCopy({ kind: 'increase', weightKg: 15, deltaKg: 2.5, reason: 'easy' })
 * // { badge: '+2,5 kg', reason: 'foi fácil da última vez', icon: 'arrow-up', weight: '15 kg' }
 */
export function loadSuggestionCopy(suggestion: LoadSuggestion): LoadSuggestionCopy {
  const reason = REASON[suggestion.reason];
  switch (suggestion.kind) {
    case 'increase':
    case 'decrease': {
      const sign = suggestion.deltaKg > 0 ? '+' : '−';
      return {
        badge: `${sign}${formatarCarga(Math.abs(suggestion.deltaKg))}`,
        reason,
        icon: suggestion.kind === 'increase' ? 'arrow-up' : 'arrow-down',
        weight: formatarCarga(suggestion.weightKg),
      };
    }
    case 'add_reps':
      return { badge: `+${suggestion.reps} repetição`, reason, icon: 'add', weight: null };
    case 'add_seconds':
      return { badge: `+${suggestion.seconds} s`, reason, icon: 'add', weight: null };
    case 'keep':
      return {
        badge: 'Mantém',
        reason,
        icon: 'remove',
        weight: suggestion.weightKg ? formatarCarga(suggestion.weightKg) : null,
      };
  }
}

/**
 * A carga sugerida como a prescrição escreve, para a sessão usar: "12,5".
 * Nulo quando não há carga a aplicar.
 *
 * @example suggestedWeightText({ kind: 'increase', weightKg: 12.5, deltaKg: 2.5, reason: 'easy' }) // "12,5"
 */
export function suggestedWeightText(suggestion: LoadSuggestion): string | null {
  if (suggestion.kind === 'add_reps' || suggestion.kind === 'add_seconds') return null;
  return suggestion.weightKg ? formatarDecimal(suggestion.weightKg) : null;
}
