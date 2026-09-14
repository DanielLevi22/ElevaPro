import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { registrarAviso } from '@/lib/registro';
import { localDateKey, syncDailyMetrics } from '@/services/healthSync';
import {
  canReadToday,
  type DailyAggregate,
  readToday,
  refreshCapabilitiesIfStale,
} from '@/shared/wearable';

/**
 * Origem do dado exibido. Existe porque o fallback de desenvolvimento é
 * indistinguível de leitura real no tipo antigo — a UI precisa poder sinalizar
 * que o número é simulado, senão falha de permissão parece dado congelado.
 */
export type HealthDataSource = 'device' | 'mock' | 'unavailable';

export interface HealthData {
  steps: number;
  calories: number;
  /** Minutos dormidos na noite anterior. `null` = sem leitura, nunca zero. */
  sleepMinutes: number | null;
  /** FC de repouso em bpm. `null` = sem leitura. */
  restingHeartRate: number | null;
  loading: boolean;
  error: string | null;
  source: HealthDataSource;
}

const MOCK_METRICS: DailyAggregate = {
  steps: 7543,
  calories: 450,
  sleepMinutes: 431,
  restingHeartRate: 58,
  hasRecords: true,
};

const INITIAL_STATE: HealthData = {
  steps: 0,
  calories: 0,
  sleepMinutes: null,
  restingHeartRate: null,
  loading: true,
  error: null,
  source: 'unavailable',
};

/**
 * Em dev o emulador não tem Health Connect; sem o mock a tela fica sempre vazia.
 * O mock nunca sai de `__DEV__`, nunca chega ao banco e nunca prova capacidade: a
 * detecção lê a plataforma por conta própria.
 */
function unavailableState(reason: string): HealthData {
  if (__DEV__) {
    return { ...MOCK_METRICS, loading: false, error: null, source: 'mock' };
  }
  return { ...INITIAL_STATE, loading: false, error: reason };
}

/** Persiste só leitura real, e só quando houve registro. */
async function persistToday(today: DailyAggregate): Promise<void> {
  if (!today.hasRecords) return;
  await syncDailyMetrics({
    date: localDateKey(),
    steps: today.steps,
    active_calories: today.calories,
    // `?? undefined` e não `?? null`: nulo aqui apagaria a leitura boa de mais
    // cedo. Ver `upsertDaily`.
    sleep_minutes: today.sleepMinutes ?? undefined,
    resting_heart_rate: today.restingHeartRate ?? undefined,
  });
}

async function loadToday(): Promise<HealthData> {
  try {
    if (!(await canReadToday())) return unavailableState('Permissão não concedida');
    const today = await readToday();
    await persistToday(today);
    return { ...today, loading: false, error: null, source: 'device' };
  } catch (error: unknown) {
    registrarAviso('relogio.ler_dia');
    return unavailableState(error instanceof Error ? error.message : String(error));
  }
}

/**
 * O agregado de hoje lido do relógio, recarregado ao voltar do background.
 *
 * @example
 * const { steps, sleepMinutes, source, refetch } = useHealthData();
 */
export function useHealthData() {
  const [data, setData] = useState<HealthData>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    setData((previous) => ({ ...previous, loading: true }));
    setData(await loadToday());
    // Abrir o app é quando o que o relógio entrega pode ter mudado (relógio novo,
    // permissão revista). A detecção tem janela própria de validade.
    void refreshCapabilitiesIfStale();
  }, []);

  useEffect(() => {
    refetch();
    // Health Connect acumula durante o background; só reconciliamos ao voltar.
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  return { ...data, refetch, hasPermissions: data.source === 'device' };
}
