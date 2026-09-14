/**
 * O Relógio: a única porta do app para o Health Connect e o HealthKit (ADR-0026).
 *
 * Qualquer relógio que escreva nessas plataformas funciona; a marca não importa.
 * O que cada relógio entrega é julgado pelo dado que chega, em
 * `refreshCapabilitiesIfStale`, e fica em `readCapabilityReport`.
 */

import type { SessionVitals } from '@elevapro/shared';
import { currentPlatform } from './currentPlatform';
import type { DailyAggregate } from './daily';
import { vitalsFromReader } from './sessionVitals';
import { CAPABILITIES } from './types';

export { clearCapabilityReport, readCapabilityReport } from './capabilityCache';
export type { DailyAggregate } from './daily';
export { refreshCapabilities, refreshCapabilitiesIfStale } from './refresh';
export type { Capability, CapabilityReport, CapabilityStatus } from './types';

/**
 * A plataforma de saúde existe neste aparelho? O HealthKit sempre existe no iPhone;
 * o Health Connect precisa estar instalado.
 *
 * @example
 * if (!(await isPlatformAvailable())) showAlert(...);
 */
export async function isPlatformAvailable(): Promise<boolean> {
  return (await currentPlatform()?.isAvailable()) ?? false;
}

/**
 * Pede ao sistema a leitura dos tipos de todas as capacidades. No Android devolve
 * se passos ou calorias foram concedidos; no iPhone, só que o diálogo foi
 * respondido, porque o HealthKit não revela leitura negada.
 *
 * @example
 * if (!(await requestReadPermissions())) showAlert(...);
 */
export async function requestReadPermissions(): Promise<boolean> {
  return (await currentPlatform()?.requestPermissions(CAPABILITIES)) ?? false;
}

/**
 * Pede a leitura em background, que só o Health Connect separa das demais.
 *
 * @example
 * await requestBackgroundRead();
 */
export async function requestBackgroundRead(): Promise<void> {
  await currentPlatform()?.requestBackgroundRead();
}

/**
 * O agregado de hoje em primeiro plano, ou `null` sem acesso à plataforma.
 *
 * @example
 * const today = await readTodayInForeground();
 */
export async function readTodayInForeground(): Promise<DailyAggregate | null> {
  const platform = currentPlatform();
  if (!platform || !(await platform.ensureTodayAccess('foreground'))) return null;
  return platform.readToday();
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
    const platform = currentPlatform();
    if (!platform || !(await platform.ensureTodayAccess('background'))) return null;
    const today = await platform.readToday();
    return today.hasRecords ? today : null;
  } catch {
    return null;
  }
}

/**
 * FC média e tempo por zona da janela de uma sessão, ou `null` quando não há o que
 * gravar. Sem FC máxima, as zonas vêm nulas. A série lida nunca sai do módulo.
 *
 * @example
 * const vitals = await readSessionVitals(startedAt, finishedAt, profile.maxHeartRate);
 */
export async function readSessionVitals(
  start: Date,
  end: Date,
  maxHeartRate: number | null
): Promise<SessionVitals | null> {
  const platform = currentPlatform();
  return platform ? vitalsFromReader(platform.reader, { start, end }, maxHeartRate) : null;
}
