import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { readDeviceMetrics } from '@/hooks/useHealthData';
import { localDateKey, syncDailyMetrics } from './healthSync';

const BACKGROUND_HEALTH_SYNC = 'BACKGROUND_HEALTH_SYNC';

// 30 min: passos são agregado diário, não evento. Intervalo menor gastaria
// bateria para reescrever o mesmo número — o SO já ignora pedidos agressivos.
const SYNC_INTERVAL_SECONDS = 60 * 30;

// Task própria, separada de BACKGROUND_DIET_SYNC de propósito: uma falha do
// Health Connect não pode suprimir o reagendamento de notificação de refeição.
TaskManager.defineTask(BACKGROUND_HEALTH_SYNC, async () => {
  const metrics = await readDeviceMetrics();
  if (!metrics) return BackgroundFetch.BackgroundFetchResult.NoData;

  const outcome = await syncDailyMetrics({
    date: localDateKey(),
    steps: metrics.steps,
    active_calories: metrics.calories,
  });

  return outcome === 'saved'
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.NoData;
});

export async function registerHealthSyncAsync(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_SYNC)) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_HEALTH_SYNC, {
      minimumInterval: SYNC_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error: unknown) {
    console.log('[HealthSync] Falha ao registrar task de background:', String(error));
  }
}

export async function unregisterHealthSyncAsync(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_SYNC)) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC);
    }
  } catch (error: unknown) {
    console.log('[HealthSync] Falha ao desregistrar task de background:', String(error));
  }
}
