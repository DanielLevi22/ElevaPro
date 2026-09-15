import { type ConsentStatus, dataCurtaDoInstante, POLICY_VERSION } from '@elevapro/shared';
import type { BackgroundReadStatus, CapabilityReport, CapabilityStatus } from '@/shared/wearable';

/**
 * O health check da tela 6: o que falta para o app acompanhar tudo, derivado do
 * estado que já existe — o aceite, a plataforma, o relatório de capacidades, a
 * leitura em segundo plano e os dias de histórico. Não grava nada.
 */

export type CheckState = 'ok' | 'pending' | 'attention';
/** Aonde "Ajustar" leva: o consentimento, a tela de permissões ou o sistema. */
export type CheckFix = 'consent' | 'permissions' | 'settings' | 'none';
export type CheckId = 'consent' | 'watch' | 'sleep' | 'workoutHeartRate' | 'background' | 'history';

export interface HealthCheck {
  id: CheckId;
  state: CheckState;
  title: string;
  detail: string;
  fix: CheckFix;
}

export interface HealthCheckInput {
  platform: 'health_connect' | 'healthkit' | null;
  consent: ConsentStatus;
  platformAvailable: boolean;
  capabilities: CapabilityReport;
  background: BackgroundReadStatus;
  /** Dias com leitura gravada nos últimos 7. */
  historyDays: number;
}

export interface HealthCheckResult {
  checks: HealthCheck[];
  okCount: number;
  total: number;
}

const HISTORY_TARGET = 7;

const PLATFORM_LABEL = { health_connect: 'Health Connect', healthkit: 'Apple Health' } as const;

/**
 * O nome que o Student reconhece da plataforma de saúde do aparelho.
 *
 * @example platformLabel('health_connect') // "Health Connect"
 */
export function platformLabel(platform: 'health_connect' | 'healthkit' | null): string {
  return platform ? PLATFORM_LABEL[platform] : 'App de saúde';
}

function consentCheck({ state, givenAt }: ConsentStatus): HealthCheck {
  const base = { id: 'consent', title: 'Consentimento de saúde' } as const;
  if (state === 'granted' && givenAt) {
    return {
      ...base,
      state: 'ok',
      detail: `Versão ${POLICY_VERSION} aceita em ${dataCurtaDoInstante(givenAt)}`,
      fix: 'none',
    };
  }
  const detail = {
    granted: `Aceite pendente da versão ${POLICY_VERSION}`,
    outdated: `Aceite pendente da versão ${POLICY_VERSION}`,
    revoked: 'Autorização retirada: nada novo é gravado',
    missing: 'Ainda não autorizado: nada é gravado',
  }[state];
  return { ...base, state: 'attention', detail, fix: 'consent' };
}

interface CapabilityCopy {
  id: CheckId;
  title: string;
  ok: string;
  missing: string;
  unknown: string;
}

function capabilityCheck(status: CapabilityStatus, copy: CapabilityCopy): HealthCheck {
  const base = { id: copy.id, title: copy.title };
  if (status === 'available') return { ...base, state: 'ok', detail: copy.ok, fix: 'none' };
  if (status === 'unknown') return { ...base, state: 'pending', detail: copy.unknown, fix: 'none' };
  return { ...base, state: 'attention', detail: copy.missing, fix: 'permissions' };
}

function watchCheck(input: HealthCheckInput): HealthCheck {
  if (!input.platformAvailable) {
    const name = platformLabel(input.platform);
    return {
      id: 'watch',
      title: 'Relógio conectado',
      state: 'attention',
      detail: `${name} não está disponível neste aparelho`,
      fix: 'settings',
    };
  }
  return capabilityCheck(input.capabilities.dailyActivity, {
    id: 'watch',
    title: 'Relógio conectado',
    ok: 'Passos e calorias chegando',
    missing: 'Sem passos e calorias: o relógio não entrega ou a permissão foi negada',
    unknown: 'Ainda sem leitura para conferir',
  });
}

function backgroundCheck(status: BackgroundReadStatus): HealthCheck | null {
  if (status === 'not_applicable') return null;
  const base = { id: 'background', title: 'Leitura em segundo plano' } as const;
  if (status === 'granted')
    return { ...base, state: 'ok', detail: 'Sincroniza sozinho', fix: 'none' };
  return {
    ...base,
    state: 'attention',
    detail: 'Os dados só chegam quando você abre o app',
    fix: 'permissions',
  };
}

function historyCheck(days: number): HealthCheck {
  const collected = Math.min(days, HISTORY_TARGET);
  return {
    id: 'history',
    title: 'Histórico',
    // Pendência que o tempo resolve, e não defeito: não há "Ajustar" para ela.
    state: collected >= HISTORY_TARGET ? 'ok' : 'pending',
    detail: `${collected} de ${HISTORY_TARGET} dias coletados`,
    fix: 'none',
  };
}

/**
 * As verificações do health check, na ordem do kit, e quantas passam.
 *
 * @example healthChecklist({ platform: 'health_connect', consent, platformAvailable: true, … })
 */
export function healthChecklist(input: HealthCheckInput): HealthCheckResult {
  const checks = [
    consentCheck(input.consent),
    watchCheck(input),
    capabilityCheck(input.capabilities.sleepAndRestingHr, {
      id: 'sleep',
      title: 'Sono e FC de repouso',
      ok: 'Chegando do relógio',
      missing: 'Sem sono ou FC de repouso: a prontidão do dia não aparece',
      unknown: 'Ainda sem leitura para conferir',
    }),
    capabilityCheck(input.capabilities.workoutHeartRate, {
      id: 'workoutHeartRate',
      title: 'FC durante o treino',
      ok: 'A média e as zonas das corridas são gravadas',
      missing: 'Sem FC no treino: a média e as zonas das corridas não são gravadas',
      unknown: 'Ainda sem corrida para conferir',
    }),
    backgroundCheck(input.background),
    historyCheck(input.historyDays),
  ].filter((item): item is HealthCheck => item !== null);

  return {
    checks,
    okCount: checks.filter((item) => item.state === 'ok').length,
    total: checks.length,
  };
}
