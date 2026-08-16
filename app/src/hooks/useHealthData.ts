import {
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getGrantedPermissions, initialize, readRecords } from 'react-native-health-connect';
import { localDateKey, syncDailyMetrics } from '@/services/healthSync';

/**
 * Origem do dado exibido. Existe porque o fallback de desenvolvimento é
 * indistinguível de leitura real no tipo antigo — a UI precisa poder sinalizar
 * que o número é simulado, senão falha de permissão parece dado congelado.
 */
export type HealthDataSource = 'device' | 'mock' | 'unavailable';

export interface HealthData {
  steps: number;
  calories: number;
  loading: boolean;
  error: string | null;
  source: HealthDataSource;
}

interface HealthMetrics {
  steps: number;
  calories: number;
  /**
   * Falso quando o Health Connect não devolveu nenhum registro.
   *
   * Sem esta bandeira, "o aparelho não anda desde a meia-noite" e "a leitura
   * foi negada" chegam idênticos aqui — os dois viram `{ steps: 0 }`. O
   * segundo caso sobrescrevia o agregado bom com zero.
   */
  hasRecords: boolean;
}

const MOCK_METRICS: HealthMetrics = { steps: 7543, calories: 450, hasRecords: true };

const IOS_AUTH = {
  toRead: ['HKQuantityTypeIdentifierStepCount', 'HKQuantityTypeIdentifierActiveEnergyBurned'],
} as const;

function todayRange(): { startTime: string; endTime: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

/**
 * Checa permissões do Health Connect de forma auto-suficiente.
 *
 * Sempre chama `initialize()` antes de consultar: o SDK rejeita
 * `getGrantedPermissions()` num cliente não inicializado, e este caminho roda
 * no retorno do background, quando o processo pode ter sido recriado.
 *
 * @example
 * if (await hasAndroidPermissions()) await readAndroidMetrics();
 */
async function hasAndroidPermissions(): Promise<boolean> {
  const isInitialized = await initialize();
  if (!isInitialized) return false;

  const granted = await getGrantedPermissions();
  const canRead = (recordType: string) =>
    granted.some((p) => p.recordType === recordType && p.accessType === 'read');

  return canRead('Steps') && canRead('ActiveCaloriesBurned');
}

/**
 * Leitura sem React, para a task de background reaproveitar exatamente as
 * mesmas regras de permissão e agregação que a UI usa.
 *
 * Retorna `null` quando não há permissão ou o SDK falhou — nunca lança, porque
 * o chamador é um TaskManager que não tem onde tratar exceção.
 *
 * @example
 * const metrics = await readDeviceMetrics();
 * if (metrics) await syncDailyMetrics({ date, ...metrics });
 */
export async function readDeviceMetrics(): Promise<HealthMetrics | null> {
  try {
    // O iOS saía aqui com `return null` e a task de background nunca lia nada:
    // `readIOSMetrics` existia, não era exportada, e ninguém a chamava. Em iOS
    // a sincronização era um no-op completo.
    if (Platform.OS === 'ios') {
      const metrics = await readIOSMetrics();
      return metrics.hasRecords ? metrics : null;
    }

    if (Platform.OS !== 'android') return null;
    if (!(await hasAndroidPermissions())) return null;

    const metrics = await readAndroidMetrics();

    // Leitura sem nenhum registro vira ausência, não zero. Gravar `{steps: 0}`
    // aqui sobrescreveria o agregado que o primeiro plano já salvou — o dado
    // não sumia por não ser lido, sumia por ser sobrescrito.
    if (!metrics.hasRecords) return null;

    return metrics;
  } catch {
    return null;
  }
}

async function readAndroidMetrics(): Promise<HealthMetrics> {
  const timeRangeFilter = { operator: 'between' as const, ...todayRange() };

  const [stepsResult, caloriesResult] = await Promise.all([
    readRecords('Steps', { timeRangeFilter }),
    readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
  ]);

  const steps = stepsResult.records.reduce((acc, record) => acc + record.count, 0);
  const calories = caloriesResult.records.reduce(
    (acc, record) => acc + record.energy.inKilocalories,
    0
  );

  // O Health Connect devolve lista vazia quando a leitura é negada, em vez de
  // lançar — inclusive quando falta `READ_HEALTH_DATA_IN_BACKGROUND`, que é
  // concedida à parte das permissões comuns.
  const hasRecords = stepsResult.records.length > 0 || caloriesResult.records.length > 0;

  return { steps, calories: Math.round(calories), hasRecords };
}

/** Em dev o emulador não tem Health Connect; sem o mock a tela fica sempre vazia. */
function unavailableState(reason: string): HealthData {
  if (__DEV__) {
    console.log(`[HealthConnect] ${reason} — usando dados MOCK (source: 'mock').`);
    return { ...MOCK_METRICS, loading: false, error: null, source: 'mock' };
  }
  return { steps: 0, calories: 0, loading: false, error: reason, source: 'unavailable' };
}

export function useHealthData() {
  const [data, setData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    loading: true,
    error: null,
    source: 'unavailable',
  });

  const loadAndroid = useCallback(async () => {
    try {
      if (!(await hasAndroidPermissions())) {
        setData(unavailableState('Permissão não concedida'));
        return;
      }
      const metrics = await readAndroidMetrics();
      setData({ ...metrics, loading: false, error: null, source: 'device' });

      // Persiste só leitura real, e só quando houve registro. O mock nunca
      // chega ao banco, e zero-por-ausência nunca sobrescreve zero-medido.
      if (metrics.hasRecords) {
        await syncDailyMetrics({
          date: localDateKey(),
          steps: metrics.steps,
          active_calories: metrics.calories,
        });
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log('[HealthConnect] Falha ao ler dados:', reason);
      setData(unavailableState(reason));
    }
  }, []);

  const loadIOS = useCallback(async () => {
    try {
      const granted = await requestAuthorization(IOS_AUTH);
      if (!granted) {
        setData(unavailableState('Permissão não concedida'));
        return;
      }
      setData({ ...(await readIOSMetrics()), loading: false, error: null, source: 'device' });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log('[HealthKit] Falha ao ler dados:', reason);
      setData(unavailableState(reason));
    }
  }, []);

  const refetch = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    if (Platform.OS === 'ios') {
      await loadIOS();
      return;
    }
    await loadAndroid();
  }, [loadAndroid, loadIOS]);

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

/**
 * Total do dia no HealthKit.
 *
 * `queryStatisticsForQuantity` com `cumulativeSum` devolve o agregado pronto,
 * o que dispensa somar amostras na mão como fazia a API antiga.
 */
async function readIOSMetrics(): Promise<HealthMetrics> {
  const { startTime, endTime } = todayRange();
  const filter = {
    filter: { date: { startDate: new Date(startTime), endDate: new Date(endTime) } },
  };

  const [stepsStats, caloriesStats] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], filter),
    queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      filter
    ),
  ]);

  // `sumQuantity` ausente é o equivalente iOS da lista vazia do Android: não
  // houve amostra no período. Distinto de ter havido e somado zero.
  const semAmostra = stepsStats.sumQuantity == null && caloriesStats.sumQuantity == null;

  return {
    steps: Math.round(stepsStats.sumQuantity?.quantity ?? 0),
    calories: Math.round(caloriesStats.sumQuantity?.quantity ?? 0),
    hasRecords: !semAmostra,
  };
}
