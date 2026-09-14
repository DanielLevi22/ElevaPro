/** Um intervalo de tempo fechado nas duas pontas. */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * O que o relógio do Student entrega às plataformas de saúde (ADR-0026). É também
 * a lista das capacidades que alguma funcionalidade usa hoje: as permissões saem
 * daqui, e uma capacidade nova entra junto com a funcionalidade que a consome.
 *
 * - `dailyActivity`: passos e calorias ativas do dia;
 * - `sleepAndRestingHr`: sessão de sono e FC de repouso;
 * - `workoutHeartRate`: batimentos gravados durante o treino.
 */
export const CAPABILITIES = ['dailyActivity', 'sleepAndRestingHr', 'workoutHeartRate'] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * `unknown` não é `unavailable`: é "não há como julgar" — sem consentimento, ou
 * sem uma sessão de cardio onde procurar batimento. A tela trata os dois de
 * forma diferente: um pede ação ao Student, o outro diz o que falta no relógio.
 */
const STATUSES = ['available', 'unavailable', 'unknown'] as const;

export type CapabilityStatus = (typeof STATUSES)[number];

export type CapabilityReport = Record<Capability, CapabilityStatus>;

/**
 * O valor é um estado de capacidade? Guarda de tipo para o que vem do armazenamento.
 *
 * @example
 * const status = isCapabilityStatus(raw) ? raw : 'unknown';
 */
export function isCapabilityStatus(value: unknown): value is CapabilityStatus {
  return STATUSES.some((status) => status === value);
}

/**
 * O que cada plataforma de saúde responde, sem regra de negócio.
 *
 * É a seam entre o Health Connect e o HealthKit: as duas implementações moram
 * no módulo, e o teste usa uma terceira, falsa. Nenhum método lança — falha de
 * leitura é "não há dado", o mesmo que a plataforma devolve quando a leitura
 * foi negada.
 */
export interface WearableReader {
  hasDailyActivity(range: TimeRange): Promise<boolean>;
  hasSleep(range: TimeRange): Promise<boolean>;
  hasRestingHeartRate(range: TimeRange): Promise<boolean>;
  /**
   * Batimentos do intervalo, em bpm. Nunca sai do módulo: quem está fora recebe
   * a média ou a contagem, e nunca a série (ADR-0024).
   */
  heartRateSamples(range: TimeRange): Promise<number[]>;
}
