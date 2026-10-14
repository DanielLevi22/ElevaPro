import type { DailyAggregate } from './daily';
import type { Capability, TimeRange, WearableReader } from './types';

/**
 * Onde a leitura acontece. Em background não há tela: o HealthKit não pode abrir
 * diálogo, e o Health Connect exige a permissão própria de leitura em segundo plano.
 */
export type ReadContext = 'foreground' | 'background';

/** A leitura em segundo plano: concedida, negada, ou algo que a plataforma não separa. */
export type BackgroundReadStatus = 'granted' | 'denied' | 'not_applicable';

/**
 * O que "desconectar" conseguiu: o Health Connect revoga as permissões do app; o
 * HealthKit não deixa o app revogar, e o que resta é abrir os Ajustes.
 */
export type DisconnectResult = 'revoked' | 'opened_settings';

/**
 * Tudo o que o app pede a uma plataforma de saúde. O Health Connect e o HealthKit
 * implementam esta interface, e só `currentPlatform` escolhe entre os dois.
 */
export interface WearablePlatform {
  /** Nome estável para log estruturado. */
  name: 'health_connect' | 'healthkit';
  reader: WearableReader;
  /** A plataforma existe e responde neste aparelho. */
  isAvailable(): Promise<boolean>;
  /**
   * Pede a leitura dos tipos das capacidades. No Health Connect devolve se passos
   * ou calorias foram concedidos; no HealthKit, só se o diálogo foi respondido,
   * porque ele não revela leitura negada.
   */
  requestPermissions(capabilities: readonly Capability[]): Promise<boolean>;
  requestBackgroundRead(): Promise<void>;
  /** Deixa a leitura do dia pronta, pedindo acesso onde a plataforma o faz sem diálogo novo. */
  ensureTodayAccess(context: ReadContext): Promise<boolean>;
  readToday(): Promise<DailyAggregate>;
  /**
   * Pede a leitura do peso, à parte das capacidades: só o check-in a usa, e só
   * quando a pessoa toca "Usar o peso do app Saúde" (F9). Devolve as pesagens do
   * intervalo em kg, ou vazio sem permissão. Nunca sai do módulo: fora dele, só a
   * média (`readWeekAverageWeight`).
   */
  readWeights(range: TimeRange): Promise<number[]>;
  backgroundReadStatus(): Promise<BackgroundReadStatus>;
  /** A tela do sistema onde o Student muda o que concedeu. */
  openSettings(): Promise<void>;
  disconnect(): Promise<DisconnectResult>;
}
