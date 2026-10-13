import type { PersonaTrack } from '@elevapro/shared/data/anamnesisAdaptive';
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

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

/** O nível com o texto do onboarding; o valor é o `PersonaTrack` da anamnese adaptativa. */
export const LEVEL_OPTIONS = [
  {
    track: 'beginner',
    label: 'Iniciante',
    detail: 'Nunca treinei ou faz tempo',
    icon: 'leaf-outline',
  },
  {
    track: 'returning',
    label: 'Voltando',
    detail: 'Já treinei, estou recomeçando',
    icon: 'refresh-outline',
  },
  {
    track: 'intermediate',
    label: 'Intermediário',
    detail: 'Treino com frequência',
    icon: 'pulse-outline',
  },
  {
    track: 'advanced',
    label: 'Avançado',
    detail: 'Treino há anos e acompanho carga',
    icon: 'speedometer-outline',
  },
] as const satisfies readonly {
  track: PersonaTrack;
  label: string;
  detail: string;
  icon: IconName;
}[];
