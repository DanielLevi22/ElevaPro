/** O agregado de hoje, como as plataformas de saúde o entregam. */
export interface DailyAggregate {
  steps: number;
  calories: number;
  /**
   * Nulo é ausência de leitura, e zero é uma leitura de zero. Sem essa distinção,
   * "o relógio não mediu o sono" e "a pessoa não dormiu" chegam idênticos ao
   * banco, e o segundo apaga o primeiro.
   */
  sleepMinutes: number | null;
  restingHeartRate: number | null;
  /**
   * Falso quando a plataforma não devolveu nenhum registro de passos nem de
   * calorias. Sem esta bandeira, "o aparelho não anda desde a meia-noite" e "a
   * leitura foi negada" chegam idênticos — os dois viram `{ steps: 0 }`, e o
   * segundo sobrescrevia o agregado bom com zero.
   */
  hasRecords: boolean;
}

/**
 * Estágios que contam como sono dormido — os mesmos códigos no Health Connect e
 * no HealthKit.
 *
 * `inBed` (0) e `awake` (2) ficam de fora: deitar às 22h e dormir às 23h30 são
 * uma hora e meia que não é sono, e somá-la infla a duração em quem demora a
 * pegar no sono — justamente quem o especialista precisaria enxergar. Os três
 * estágios finos são somados sem distinção porque só a duração é guardada
 * (migration `0046`).
 */
export const ASLEEP_STAGES = new Set([1, 3, 4, 5]);

/**
 * Janela de sono: ontem ao meio-dia até hoje ao meio-dia.
 *
 * Não é o dia civil. Quem dorme às 23h teria a noite partida em dois dias, e cada
 * metade seria gravada num registro diferente — o especialista veria duas noites
 * de quatro horas onde houve uma de oito. O corte ao meio-dia é o mesmo que Apple
 * e Google usam para atribuir uma noite a um dia.
 *
 * @example
 * readSleep(sleepRange());
 */
export function sleepRange(now: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start, end };
}

/**
 * O dia civil local de hoje, da meia-noite à meia-noite seguinte.
 *
 * @example
 * readSteps(todayRange());
 */
export function todayRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
