import { formatarDuracao } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { formatKilometers } from '../../services/cardioMetrics';
import type { LapSummary } from '../../store/cardioSessionMachine';

/**
 * As voltas da sessão, da mais recente para a primeira, com a mais rápida em
 * destaque — a lista da tela de pausa do kit.
 *
 * Com GPS a volta mostra distância e velocidade, e a mais rápida é a de maior
 * velocidade; sem GPS, só o tempo, e a mais rápida é a mais curta.
 *
 * @example <LapList laps={lapSummaries(session, distance)} />
 */
export function LapList({ laps }: { laps: LapSummary[] }) {
  if (laps.length === 0) return null;
  const fastest = laps.length > 1 ? fastestLap(laps) : -1;

  return (
    <>
      <TituloDeSecao
        estilo="rotulo"
        acao={`${laps.length} ${laps.length === 1 ? 'volta' : 'voltas'}`}
      >
        Voltas
      </TituloDeSecao>
      {laps
        .map((lap, index) => ({ lap, number: index + 1 }))
        .reverse()
        .map(({ lap, number }) => (
          <LapRow key={number} lap={lap} number={number} fastest={number - 1 === fastest} />
        ))}
    </>
  );
}

function lapScore(lap: LapSummary): number {
  if (lap.distanceMeters !== null && lap.distanceMeters > 0) {
    return lap.distanceMeters / lap.durationMs;
  }
  return 1 / Math.max(1, lap.durationMs);
}

function fastestLap(laps: LapSummary[]): number {
  return laps.reduce(
    (best, lap, index) => (lapScore(lap) > lapScore(laps[best]) ? index : best),
    0
  );
}

function LapRow({ lap, number, fastest }: { lap: LapSummary; number: number; fastest: boolean }) {
  // Direto, e não pelo `speedKmh`: a trava de um minuto de lá protege a média ao
  // vivo da deriva do começo, e uma volta de 40 s tem velocidade de verdade.
  const speed =
    lap.distanceMeters !== null && lap.distanceMeters > 0 && lap.durationMs > 0
      ? lap.distanceMeters / 1000 / (lap.durationMs / 3_600_000)
      : null;
  const detail =
    lap.distanceMeters === null
      ? null
      : [
          `${formatKilometers(lap.distanceMeters)} km`,
          speed === null ? null : `${speed.toFixed(1).replace('.', ',')} km/h`,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <Vidro
      destaque={fastest}
      classeExterna="mb-[0.5625rem]"
      className="flex-row items-center gap-3 p-3"
    >
      <View className="h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-[0.625rem] bg-glass-strong">
        <Text
          className={cn(
            'font-display-black text-[0.8125rem]',
            fastest ? 'text-primary-text' : 'text-muted-foreground'
          )}
        >
          {number}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[0.84375rem] font-semibold text-foreground">Volta {number}</Text>
        {detail ? (
          <Text className="mt-px text-[0.71875rem] text-muted-foreground">{detail}</Text>
        ) : null}
      </View>
      <Text className="font-display-black text-[0.9375rem] tracking-tight text-foreground">
        {formatarDuracao(lap.durationMs / 1000)}
      </Text>
    </Vidro>
  );
}
