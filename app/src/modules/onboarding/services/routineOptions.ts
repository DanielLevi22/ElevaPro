import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * As opções de O6 e O7 com o texto do desenho. Os valores gravados são os que o
 * contexto do coach já lê: dias e minutos como número ("4x/semana", "45 min") e
 * o local nos valores do catálogo da anamnese.
 */
export const TRAINING_DAYS = [2, 3, 4, 5, 6] as const;

export const SESSION_MINUTES = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
] as const;

export const TRAINING_PLACES = [
  { value: 'Academia completa', label: 'Academia', icon: 'business-outline' },
  { value: 'Home gym', label: 'Casa', icon: 'home-outline' },
  { value: 'Ao ar livre', label: 'Ao ar livre', icon: 'leaf-outline' },
] as const satisfies readonly { value: string; label: string; icon: IconName }[];

export const HOME_EQUIPMENT = ['Halteres', 'Elástico', 'Barra fixa', 'Só o corpo'] as const;

export const NO_SPORT = 'Nenhum';
export const SPORTS = [
  'Corrida',
  'Beach tennis',
  'Futebol',
  'Jiu-jitsu',
  'Ciclismo',
  NO_SPORT,
] as const;

export const MEALS_PER_DAY = [3, 4, 5, 6] as const;

/** Exclusão de alimento, nunca diagnóstico: o mesmo princípio de `diet_plans` (§2.2). */
export const FOOD_EXCLUSIONS = ['Lactose', 'Glúten', 'Carne vermelha', 'Peixe', 'Ovo'] as const;

export const DIET_STYLES = [
  { value: 'Onívoro', label: 'Onívoro' },
  { value: 'Vegetariano', label: 'Vegetariano' },
  { value: 'Vegano', label: 'Vegano' },
] as const;

export const FOOD_ROUTINES = ['Cozinho', 'Marmita', 'Como fora'] as const;

export const FOOD_BUDGETS = [
  { value: 'Econômico', label: 'Econômico' },
  { value: 'Médio', label: 'Médio' },
  { value: 'Livre', label: 'Livre' },
] as const;
