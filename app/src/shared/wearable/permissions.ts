import type { requestAuthorization } from '@kingstinct/react-native-healthkit';
import type { readRecords } from 'react-native-health-connect';
import type { Capability } from './types';

/** Derivados das assinaturas: os pacotes não exportam o tipo na raiz. */
export type HealthConnectType = Parameters<typeof readRecords>[0];
export type HealthKitType = NonNullable<
  Parameters<typeof requestAuthorization>[0]['toRead']
>[number];

/**
 * Os tipos que a prova de cada capacidade lê, e só eles.
 *
 * Tipo pedido é tipo lido: pedir VFC, VO₂ máx. ou sessão de exercício "para
 * depois" é o critério que a `LGPD_COMPLIANCE.md` §2.3 recusa. Uma capacidade
 * nova entra aqui junto com a funcionalidade que a usa.
 */
const HEALTH_CONNECT_TYPES: Record<Capability, readonly HealthConnectType[]> = {
  dailyActivity: ['Steps', 'ActiveCaloriesBurned'],
  sleepAndRestingHr: ['SleepSession', 'RestingHeartRate'],
  workoutHeartRate: ['HeartRate'],
};

const HEALTH_KIT_TYPES: Record<Capability, readonly HealthKitType[]> = {
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

function uniqueTypes<T>(
  table: Record<Capability, readonly T[]>,
  capabilities: readonly Capability[]
): T[] {
  return [...new Set(capabilities.flatMap((capability) => table[capability]))];
}

/**
 * Record types do Health Connect para pedir leitura.
 *
 * @example
 * requestPermission(healthConnectReadTypes(CAPABILITIES).map((recordType) => ({ accessType: 'read', recordType })));
 */
export function healthConnectReadTypes(capabilities: readonly Capability[]): HealthConnectType[] {
  return uniqueTypes(HEALTH_CONNECT_TYPES, capabilities);
}

/**
 * Identificadores do HealthKit para pedir leitura.
 *
 * @example
 * requestAuthorization({ toRead: healthKitReadTypes(CAPABILITIES) });
 */
export function healthKitReadTypes(capabilities: readonly Capability[]): HealthKitType[] {
  return uniqueTypes(HEALTH_KIT_TYPES, capabilities);
}
