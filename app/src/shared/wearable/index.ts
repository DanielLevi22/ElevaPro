/**
 * O Relógio: a única porta do app para o Health Connect e o HealthKit (ADR-0026).
 *
 * Qualquer relógio que escreva nessas plataformas funciona; a marca não importa.
 * O que cada relógio entrega é julgado pelo dado que chega, em
 * `refreshCapabilitiesIfStale`, e fica em `readCapabilityReport`.
 */
import { Platform } from 'react-native';
import type { DailyAggregate } from './daily';
import {
  canReadHealthConnectToday,
  isHealthConnectAvailable,
  readHealthConnectToday,
  requestHealthConnectBackgroundRead,
  requestHealthConnectPermissions,
} from './healthConnect';
import { readHealthKitToday, requestHealthKitPermissions } from './healthKit';
import { platformReader } from './refresh';
import { averageSessionHeartRate } from './sessionHeartRate';
import type { Capability } from './types';

export { clearCapabilityReport, readCapabilityReport } from './capabilityCache';
export type { DailyAggregate } from './daily';
export { refreshCapabilitiesIfStale } from './refresh';
export type { Capability, CapabilityReport, CapabilityStatus } from './types';

/** As capacidades que alguma funcionalidade usa hoje. As permissões saem daqui. */
export const ALL_CAPABILITIES: Capability[] = [
  'dailyActivity',
  'sleepAndRestingHr',
  'workoutHeartRate',
];

/**
 * A plataforma de saúde existe neste aparelho? O HealthKit sempre existe no iPhone;
 * o Health Connect precisa estar instalado.
 *
 * @example
 * if (!(await isPlatformAvailable())) showAlert(...);
 */
export function isPlatformAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' ? Promise.resolve(true) : isHealthConnectAvailable();
}

/**
 * Pede ao sistema a leitura dos tipos das capacidades. Devolve se a leitura
 * essencial (passos ou calorias) foi concedida.
 *
 * @example
 * if (!(await requestReadPermissions())) showAlert(...);
 */
export function requestReadPermissions(): Promise<boolean> {
  return Platform.OS === 'ios'
    ? requestHealthKitPermissions(ALL_CAPABILITIES)
    : requestHealthConnectPermissions(ALL_CAPABILITIES);
}

/**
 * Pede a leitura em background, que só o Health Connect separa das demais.
 *
 * @example
 * await requestBackgroundRead();
 */
export async function requestBackgroundRead(): Promise<void> {
  if (Platform.OS === 'android') await requestHealthConnectBackgroundRead();
}

/**
 * O app pode ler o dia agora, em primeiro plano? No iOS isso é pedir a
 * autorização, que não abre diálogo de novo depois de respondida.
 *
 * @example
 * if (await canReadToday()) setToday(await readToday());
 */
export function canReadToday(): Promise<boolean> {
  return Platform.OS === 'ios'
    ? requestHealthKitPermissions(ALL_CAPABILITIES)
    : canReadHealthConnectToday({ background: false });
}

/**
 * O agregado de hoje. Chamar depois de `canReadToday`.
 *
 * @example
 * const today = await readToday();
 */
export function readToday(): Promise<DailyAggregate> {
  return Platform.OS === 'ios' ? readHealthKitToday() : readHealthConnectToday();
}

/**
 * Leitura do dia sem React, para a tarefa de background. `null` quando não há
 * permissão, registro ou a plataforma falhou — nunca lança, porque quem chama é
 * um TaskManager que não tem onde tratar exceção.
 *
 * Leitura sem nenhum registro vira ausência, não zero: gravar `{ steps: 0 }`
 * sobrescreveria o agregado que o primeiro plano já salvou.
 *
 * @example
 * const metrics = await readDeviceMetrics();
 */
export async function readDeviceMetrics(): Promise<DailyAggregate | null> {
  try {
    if (Platform.OS === 'android' && !(await canReadHealthConnectToday({ background: true }))) {
      return null;
    }
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
    const metrics = await readToday();
    return metrics.hasRecords ? metrics : null;
  } catch {
    return null;
  }
}

/**
 * FC média da janela de uma sessão, ou `null` quando não há o que gravar. A série
 * lida nunca sai do módulo.
 *
 * @example
 * const bpm = await readSessionHeartRate(startedAt, finishedAt);
 */
export function readSessionHeartRate(start: Date, end: Date): Promise<number | null> {
  return averageSessionHeartRate(platformReader(), start, end);
}
