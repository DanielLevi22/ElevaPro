export { TRAINING_DAYS, TRAINING_PLACES } from '@/shared/onboarding/choices';

export const SESSION_MINUTES = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
] as const;

export const HOME_EQUIPMENT = [
  'Halteres',
  'Elástico',
  'Barra fixa',
  'Kettlebell',
  'Anilhas',
  'Banco',
  'Corda',
  'Só o corpo',
] as const;

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
