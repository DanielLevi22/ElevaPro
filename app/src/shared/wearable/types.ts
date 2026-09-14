/** Um intervalo de tempo fechado nas duas pontas. */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * O que o relógio do Student entrega às plataformas de saúde (ADR-0026).
 *
 * - `dailyActivity`: passos e calorias ativas do dia;
 * - `sleepAndRestingHr`: sessão de sono e FC de repouso;
 * - `workoutHeartRate`: batimentos gravados durante o treino.
 */
export type Capability = 'dailyActivity' | 'sleepAndRestingHr' | 'workoutHeartRate';

/**
 * `unknown` não é `unavailable`: é "não há como julgar" — sem consentimento, ou
 * sem uma sessão de cardio onde procurar batimento. A tela trata os dois de
 * forma diferente: um pede ação ao Student, o outro diz o que falta no relógio.
 */
export type CapabilityStatus = 'available' | 'unavailable' | 'unknown';

export type CapabilityReport = Record<Capability, CapabilityStatus>;

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
