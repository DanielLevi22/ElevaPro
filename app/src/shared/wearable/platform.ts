import type { DailyAggregate } from './daily';
import type { Capability, WearableReader } from './types';

/**
 * Onde a leitura acontece. Em background não há tela: o HealthKit não pode abrir
 * diálogo, e o Health Connect exige a permissão própria de leitura em segundo plano.
 */
export type ReadContext = 'foreground' | 'background';

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
}
