import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AppleHealthKit, { type HealthKitPermissions, type HealthValue } from 'react-native-health';
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
}

const MOCK_METRICS: HealthMetrics = { steps: 7543, calories: 450 };

const IOS_PERMISSIONS = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [],
  },
} as HealthKitPermissions;

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
  if (Platform.OS !== 'android') return null;
  try {
    if (!(await hasAndroidPermissions())) return null;
    return await readAndroidMetrics();
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

  return { steps, calories: Math.round(calories) };
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

      // Persiste só leitura real. O mock nunca chega ao banco.
      await syncDailyMetrics({
        date: localDateKey(),
        steps: metrics.steps,
        active_calories: metrics.calories,
      });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log('[HealthConnect] Falha ao ler dados:', reason);
      setData(unavailableState(reason));
    }
  }, []);

  const loadIOS = useCallback(() => {
    AppleHealthKit.initHealthKit(IOS_PERMISSIONS, (initError: string) => {
      if (initError) {
        setData(unavailableState(initError));
        return;
      }
      readIOSMetrics(setData);
    });
  }, []);

  const refetch = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    if (Platform.OS === 'ios') {
      loadIOS();
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

function readIOSMetrics(setData: (state: HealthData) => void): void {
  const options = { date: new Date().toISOString(), includeManuallyAdded: true };

  AppleHealthKit.getStepCount(options, (stepsError: string, stepsResult: HealthValue) => {
    if (stepsError) {
      setData(unavailableState(stepsError));
      return;
    }

    AppleHealthKit.getActiveEnergyBurned(
      options,
      (caloriesError: string, samples: HealthValue[]) => {
        if (caloriesError) {
          setData(unavailableState(caloriesError));
          return;
        }
        const calories = samples.reduce((acc, curr) => acc + curr.value, 0);
        setData({
          steps: stepsResult.value,
          calories: Math.round(calories),
          loading: false,
          error: null,
          source: 'device',
        });
      }
    );
  });
}
