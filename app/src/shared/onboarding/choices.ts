import { TRAINING_PLACES as PLACE } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/*
 * As escolhas do onboarding que a reavaliação do fim do bloco (#376, B2)
 * mostra de novo. Moram aqui porque os dois módulos leem as mesmas, e um
 * módulo não importa o outro.
 */

/**
 * O objetivo como o onboarding mostra, e o valor que a anamnese já grava em
 * `main_goal`.
 *
 * O texto mudou com o desenho do onboarding; o valor não. Quem lê `main_goal` (a
 * sugestão de meta da dieta, o contexto do coach) continua recebendo o que já
 * conhecia, sem migração dos dados gravados.
 */
export const GOAL_OPTIONS = [
  { value: 'Emagrecimento', label: 'Perder gordura', icon: 'flame-outline' },
  { value: 'Hipertrofia', label: 'Ganhar massa', icon: 'barbell-outline' },
  { value: 'Saúde / Bem-estar', label: 'Saúde e disposição', icon: 'pulse-outline' },
  { value: 'Força / Performance', label: 'Desempenho no esporte', icon: 'trophy-outline' },
] as const satisfies readonly { value: string; label: string; icon: IconName }[];

export type OnboardingGoal = (typeof GOAL_OPTIONS)[number]['value'];

/**
 * As opções de O6 e O7 com o texto do desenho. Os valores gravados são os que o
 * contexto do coach já lê: dias e minutos como número ("4x/semana", "45 min") e
 * o local nos valores do catálogo da anamnese.
 */
export const TRAINING_DAYS = [2, 3, 4, 5, 6] as const;

/** O valor é o que a anamnese grava, e mora no `shared`: a regra compara com ele. */
export const TRAINING_PLACES = [
  { value: PLACE.fullGym, label: 'Academia', icon: 'business-outline' },
  { value: PLACE.home, label: 'Casa', icon: 'home-outline' },
  { value: PLACE.outdoor, label: 'Ao ar livre', icon: 'leaf-outline' },
] as const satisfies readonly { value: string; label: string; icon: IconName }[];
