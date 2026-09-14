import type { Capability } from './types';

/**
 * Os tipos que a prova de cada capacidade lê, e só eles.
 *
 * Tipo pedido é tipo lido: pedir VFC, VO₂ máx. ou sessão de exercício "para
 * depois" é o critério que a `LGPD_COMPLIANCE.md` §2.3 recusa. Uma capacidade
 * nova entra aqui junto com a funcionalidade que a usa.
 */
const HEALTH_CONNECT_TYPES: Record<Capability, readonly string[]> = {
  dailyActivity: ['Steps', 'ActiveCaloriesBurned'],
  sleepAndRestingHr: ['SleepSession', 'RestingHeartRate'],
  workoutHeartRate: ['HeartRate'],
};

const HEALTH_KIT_TYPES: Record<Capability, readonly string[]> = {
  dailyActivity: [
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
  ],
  sleepAndRestingHr: [
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierRestingHeartRate',
  ],
  workoutHeartRate: ['HKQuantityTypeIdentifierHeartRate'],
};

function uniqueTypes(table: Record<Capability, readonly string[]>, capabilities: Capability[]) {
  return [...new Set(capabilities.flatMap((capability) => table[capability]))];
}

/**
 * Record types do Health Connect para pedir leitura.
 *
 * @example
 * requestPermission(healthConnectReadTypes(ALL_CAPABILITIES).map((recordType) => ({ accessType: 'read', recordType })));
 */
export function healthConnectReadTypes(capabilities: Capability[]): string[] {
  return uniqueTypes(HEALTH_CONNECT_TYPES, capabilities);
}

/**
 * Identificadores do HealthKit para pedir leitura.
 *
 * @example
 * requestAuthorization({ toRead: healthKitReadTypes(ALL_CAPABILITIES) });
 */
export function healthKitReadTypes(capabilities: Capability[]): string[] {
  return uniqueTypes(HEALTH_KIT_TYPES, capabilities);
}
