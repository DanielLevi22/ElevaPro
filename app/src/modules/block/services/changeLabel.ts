import type { BlockChanges } from '@elevapro/shared';
import { GOAL_OPTIONS, TRAINING_PLACES } from '@/shared/onboarding/choices';

/**
 * O que mudou, em uma linha, para a sobrelinha da C2.
 *
 * @example changeLabel({ gym_type: 'Home gym' }) // "Novo local: casa"
 */
export function changeLabel(changes: BlockChanges): string {
  if (changes.main_goal) {
    const goal = GOAL_OPTIONS.find((option) => option.value === changes.main_goal);
    return `Novo objetivo: ${goal?.label.toLowerCase() ?? changes.main_goal}`;
  }
  if (changes.training_days) return `Novos dias: ${changes.training_days} por semana`;
  if (changes.gym_type) {
    const place = TRAINING_PLACES.find((option) => option.value === changes.gym_type);
    return `Novo local: ${place?.label.toLowerCase() ?? changes.gym_type}`;
  }
  if (changes.injuries) return 'O plano evita a região da dor';
  // Sem mudança, só a estagnação abre a troca antes do fim (#376).
  return 'Peso parado há 3 semanas';
}
