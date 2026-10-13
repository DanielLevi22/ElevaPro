import type { CheckInLogging } from '@elevapro/shared';

/** A mesma faixa que o banco recusa fora (`submit_weekly_check_in`, 0088). */
export const WEIGHT_RANGE = { min: 30, max: 300 };

/** As quatro respostas do desenho A4, na ordem do kit. */
export const LOGGING_OPTIONS: { value: CheckInLogging; label: string }[] = [
  { value: 'all', label: 'Registrei tudo' },
  { value: 'partial', label: 'Registrei parte' },
  { value: 'followed_unlogged', label: 'Não registrei, mas segui o plano' },
  { value: 'not_followed', label: 'Não segui' },
];
