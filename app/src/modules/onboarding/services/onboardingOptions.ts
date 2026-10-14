import type { PersonaTrack } from '@elevapro/shared/data/anamnesisAdaptive';
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export { GOAL_OPTIONS, type OnboardingGoal } from '@/shared/onboarding/choices';

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
