import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { readDeviceMetrics, refreshCapabilitiesIfStale } from '@/shared/wearable';
import { localDateKey, syncDailyMetrics } from './healthSync';

const BACKGROUND_HEALTH_SYNC = 'BACKGROUND_HEALTH_SYNC';

// 30 min: passos são agregado diário, não evento. Intervalo menor gastaria
// bateria para reescrever o mesmo número — o SO já ignora pedidos agressivos.
const SYNC_INTERVAL_SECONDS = 60 * 30;

// Task própria, separada de BACKGROUND_DIET_SYNC de propósito: uma falha do
// Health Connect não pode suprimir o reagendamento de notificação de refeição.
TaskManager.defineTask(BACKGROUND_HEALTH_SYNC, async () => {
  // A sincronização diária também é quando se descobre o que o relógio entrega.
  // Tem janela própria de validade e nunca lança.
  await refreshCapabilitiesIfStale();
  const metrics = await readDeviceMetrics();

  if (!metrics) {
    // Sem leitura: pode ser permissão, pode ser plataforma, pode ser SDK. O
    // `NoData` sozinho não distinguia nada — nem para nós, nem para o log.
    console.log('[HealthSync] sem leitura do dispositivo (permissão ou sem registro)');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const outcome = await syncDailyMetrics({
    date: localDateKey(),
    steps: metrics.steps,
    active_calories: metrics.calories,
  });

  if (outcome !== 'saved') {
    // Os três desfechos viravam o mesmo `NoData`, e não havia como saber, de
    // fora, se o problema era sessão, consentimento ou rede. Sem o valor lido
    // no log: passos são dado de saúde e não vão para observabilidade em texto
    // claro (Art. 6°, VII).
    console.log(`[HealthSync] não persistiu: ${outcome}`);
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  return BackgroundFetch.BackgroundFetchResult.NewData;
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
