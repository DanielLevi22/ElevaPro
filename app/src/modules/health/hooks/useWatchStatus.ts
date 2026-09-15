import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  type BackgroundReadStatus,
  backgroundReadStatus,
  type CapabilityReport,
  isPlatformAvailable,
  platformName,
  readCapabilityReport,
  refreshCapabilities,
} from '@/shared/wearable';

export interface WatchStatus {
  platform: 'health_connect' | 'healthkit' | null;
  /** O app de saúde existe neste aparelho. `null` enquanto confere. */
  available: boolean | null;
  background: BackgroundReadStatus | null;
  capabilities: CapabilityReport;
  /** Quando o relatório de capacidades foi conferido pela última vez. */
  checkedAt: Date | null;
  /** Confere de novo agora: a plataforma, a leitura em segundo plano e as capacidades. */
  recheck: () => Promise<void>;
}

const UNKNOWN_REPORT: CapabilityReport = {
  dailyActivity: 'unknown',
  sleepAndRestingHr: 'unknown',
  workoutHeartRate: 'unknown',
};

interface WatchSnapshot {
  available: boolean;
  background: BackgroundReadStatus;
}

/**
 * O estado do relógio para Meu relógio, as permissões e o health check. O relatório
 * de capacidades vem do cache do aparelho; conferir de novo detecta outra vez e
 * atualiza o cache. Nada disto vai ao servidor (§2.3).
 *
 * @example const watch = useWatchStatus(); await watch.recheck();
 */
export function useWatchStatus(): WatchStatus {
  const { data, refetch } = useQuery({
    queryKey: ['watchStatus'],
    queryFn: async (): Promise<WatchSnapshot> => {
      const [available, background] = await Promise.all([
        isPlatformAvailable(),
        backgroundReadStatus(),
      ]);
      return { available, background };
    },
  });
  // Lido a cada render: é MMKV, síncrono, e o `recheck` o atualiza antes do refetch.
  const cached = readCapabilityReport();

  const recheck = useCallback(async () => {
    await refreshCapabilities();
    await refetch();
  }, [refetch]);

  return {
    platform: platformName(),
    available: data?.available ?? null,
    background: data?.background ?? null,
    capabilities: cached?.report ?? UNKNOWN_REPORT,
    checkedAt: cached?.checkedAt ?? null,
    recheck,
  };
}
