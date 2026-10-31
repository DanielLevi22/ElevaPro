import type { CheckInLogging, Recalibration, RecalibrationVerdict } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';

export interface AdjustmentCopy {
  status: { label: string; icon: keyof typeof Ionicons.glyphMap };
  /** Uma frase com o porquê: o que o peso fez, o ritmo da meta e o passo. */
  reason: string;
  proposesChange: boolean;
}

const STATUS: Record<RecalibrationVerdict, AdjustmentCopy['status']> = {
  on_pace: { label: 'No ritmo', icon: 'checkmark-circle-outline' },
  weight_above_pace: { label: 'Acima do ritmo', icon: 'trending-up' },
  weight_below_pace: { label: 'Abaixo do ritmo', icon: 'trending-down' },
  insufficient_data: { label: 'Dados insuficientes', icon: 'ellipse-outline' },
  low_adherence: { label: 'Semana fora do plano', icon: 'list-outline' },
};

/** Abaixo disto, o peso conta como estável: é a casa decimal que a tela mostra. */
const STABLE_KG = 0.05;

const kg = (value: number) =>
  Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * O texto da tela de ajuste (A5) a partir da recalibração: o status e uma frase
 * com o porquê. O tom não cobra (#376): semana ruim acontece, e a frase diz o
 * que muda, não o que a pessoa errou.
 *
 * @example adjustmentCopy(proposta.recalibration, semana.logging).reason
 * // "Você perdeu 0,1 kg; o ritmo da sua meta era perder 0,5 kg por semana. Vamos baixar a meta em 150 kcal."
 */
export function adjustmentCopy(
  recalibration: Recalibration,
  logging: CheckInLogging
): AdjustmentCopy {
  return {
    status: STATUS[recalibration.verdict],
    reason: reasonOf(recalibration, logging),
    proposesChange: recalibration.deltaCalories !== 0,
  };
}

function reasonOf(recalibration: Recalibration, logging: CheckInLogging): string {
  const { verdict, deltaCalories, actualChangeKg, expectedChangeKg } = recalibration;
  if (verdict === 'low_adherence') {
    return 'Sem bronca: com a semana fora do plano, não mexemos nas calorias. Esta semana é um novo começo.';
  }
  if (verdict === 'insufficient_data') {
    return logging === 'partial'
      ? 'Com registro parcial mantemos a meta. Registre mais esta semana.'
      : 'Sem a pesagem desta semana e de uma anterior, mantemos a meta.';
  }
  const moved = movedPhrase(actualChangeKg ?? 0);
  if (verdict === 'on_pace')
    return `Tudo no ritmo, seguimos igual. ${moved}, dentro da faixa da sua meta.`;

  const pace = `${moved}; o ritmo da sua meta era ${pacePhrase(expectedChangeKg ?? 0)}.`;
  if (deltaCalories === 0) {
    // A trava diz qual limite segurou: o teto de ganho, ou o piso da TMB.
    const limit = recalibration.guard === 'weekly_gain_cap' ? 'máximo' : 'mínimo';
    return `${pace} Sua meta já está no ${limit} seguro, então seguimos igual.`;
  }
  const direction = deltaCalories < 0 ? 'baixar' : 'subir';
  return `${pace} Vamos ${direction} a meta em ${Math.abs(deltaCalories)} kcal.`;
}

function movedPhrase(change: number): string {
  if (change <= -STABLE_KG) return `Você perdeu ${kg(change)} kg`;
  if (change >= STABLE_KG) return `Você ganhou ${kg(change)} kg`;
  return 'Seu peso ficou estável';
}

function pacePhrase(change: number): string {
  if (change <= -STABLE_KG) return `perder ${kg(change)} kg por semana`;
  if (change >= STABLE_KG) return `ganhar ${kg(change)} kg por semana`;
  return 'manter o peso';
}
