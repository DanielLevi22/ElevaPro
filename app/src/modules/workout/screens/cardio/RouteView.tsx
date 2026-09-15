import { formatarDuracao } from '@elevapro/shared';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import type { CardioModality } from '../../cardioModalities';
import { InfoNote } from '../../components/cardio/InfoNote';
import { MetricTile } from '../../components/cardio/MetricTile';
import { RouteTrace } from '../../components/cardio/RouteTrace';
import type { CardioReading } from '../../services/cardioMetrics';
import { formatKilometers, formatPace, gpsSignal, speedKmh } from '../../services/cardioMetrics';
import { type KmSplit, kmSplits, type Posicao } from '../../services/percurso';
import type { CardioSessionState } from '../../store/cardioSessionMachine';

interface RouteViewProps {
  modality: CardioModality;
  session: CardioSessionState;
  reading: CardioReading;
  /** As posições da sessão. Só em memória: morrem quando a sessão encerra. */
  points: Posicao[];
  hasLocation: boolean;
  onClose: () => void;
  onFinish: () => void;
}

/**
 * Tela 6 do kit: o traçado, a distância, o ritmo médio e as parciais por km.
 *
 * Sem mapa de fundo, de propósito: o traçado é desenhado das posições em
 * memória, sem serviço de mapas, e é aqui o único lugar onde ele aparece
 * (issue #278). As parciais descontam as pausas.
 *
 * @example <RouteView modality={run} session={session} points={tracking.pontos} … />
 */
export function RouteView(props: RouteViewProps) {
  const { modality, session, reading, points, onClose, onFinish } = props;
  const splits = useMemo(() => kmSplits(points, session.pauses), [points, session.pauses]);

  return (
    <GlassScreen
      glow={CARDIO_GLOW}
      flushTop
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Voltar', icone: 'chevron-back', onPress: onClose }}
          principal={{ rotulo: 'Finalizar', icone: 'flag', onPress: onFinish }}
        />
      }
    >
      <TraceArea {...props} />
      <View className="-mt-[1.625rem] rounded-t-[1.75rem] bg-background px-[1.125rem] pt-5">
        <Headline modality={modality} reading={reading} />
        <View className="mt-3.5 flex-row gap-[0.5625rem]">
          <MetricTile
            icon="timer-outline"
            value={formatarDuracao(reading.elapsedMs / 1000)}
            label="Tempo"
          />
          <MetricTile
            icon="flame-outline"
            value={String(Math.round(reading.calories))}
            unit="kcal"
            label="Queima"
          />
          {modality.countsSteps ? (
            <MetricTile
              icon="footsteps-outline"
              value={reading.cadenceSpm === null ? '—' : String(reading.cadenceSpm)}
              unit="spm"
              label="Cadência"
              tone="cadence"
            />
          ) : (
            <MetricTile
              icon="flag-outline"
              value={String(reading.laps)}
              label="Voltas"
              tone="muted"
            />
          )}
        </View>
        <TituloDeSecao estilo="rotulo" acao="Por km">
          Parciais
        </TituloDeSecao>
        {splits.length > 0 ? (
          <SplitList splits={splits} />
        ) : (
          <InfoNote icon="map-outline">As parciais aparecem a cada quilômetro completo.</InfoNote>
        )}
      </View>
    </GlassScreen>
  );
}

function TraceArea({ modality, points, hasLocation, onClose }: RouteViewProps) {
  const lastAccuracy = points[points.length - 1]?.accuracy;

  return (
    <View className="h-[18.875rem] border-b border-glass-border bg-glass">
      {points.length >= 2 ? (
        <RouteTrace points={points} className="absolute inset-x-12 bottom-14 top-14" />
      ) : (
        <View className="absolute inset-0 items-center justify-center px-10">
          <Text className="text-center text-legenda text-placeholder">
            O traçado aparece quando o GPS encontrar você.
          </Text>
        </View>
      )}
      <View className="absolute left-[1.125rem] right-[1.125rem] top-14 flex-row justify-between">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar à sessão" onPress={onClose} />
      </View>
      <View className="absolute bottom-[2.375rem] left-[1.125rem] right-[1.125rem] flex-row gap-2">
        <Chip tom="destaque">{`${modality.activityName} ao ar livre`}</Chip>
        <Chip>{gpsSignal(hasLocation, lastAccuracy)}</Chip>
      </View>
    </View>
  );
}

function Headline({ modality, reading }: { modality: CardioModality; reading: CardioReading }) {
  const speed = speedKmh(reading.distanceMeters, reading.elapsedMs);
  const usesSpeed = modality.liveMetrics.includes('speed');
  let average = '—';
  if (usesSpeed && speed !== null) average = speed.toFixed(1).replace('.', ',');
  if (!usesSpeed && reading.paceSecondsPerKm !== null)
    average = formatPace(reading.paceSecondsPerKm);

  return (
    <View className="flex-row items-end justify-between">
      <View>
        <Text className="text-[0.6875rem] font-extrabold uppercase tracking-[0.16em] text-placeholder">
          Distância
        </Text>
        <View className="mt-1 flex-row items-baseline gap-1.5">
          <Text className="font-display-black text-[2.75rem] leading-[2.75rem] tracking-tighter text-foreground">
            {formatKilometers(reading.distanceMeters, 2)}
          </Text>
          <Text className="text-[0.9375rem] font-bold text-muted-foreground">km</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-[0.6875rem] font-extrabold uppercase tracking-[0.16em] text-placeholder">
          {usesSpeed ? 'Velocidade média' : 'Ritmo médio'}
        </Text>
        <View className="mt-1.5 flex-row items-baseline gap-1">
          <Text className="font-display-black text-[1.625rem] tracking-tight text-texto-cardio-ritmo">
            {average}
          </Text>
          <Text className="text-[0.75rem] text-muted-foreground">{usesSpeed ? 'km/h' : '/km'}</Text>
        </View>
      </View>
    </View>
  );
}

function SplitList({ splits }: { splits: KmSplit[] }) {
  const fastest = Math.min(...splits.map((split) => split.seconds));

  return (
    <>
      {splits.map((split) => {
        const best = split.seconds === fastest;
        return (
          <Vidro
            key={split.km}
            classeExterna="mb-2"
            className="flex-row items-center gap-3 px-[0.8125rem] py-[0.6875rem]"
          >
            <Text className="w-[2.125rem] shrink-0 text-micro font-bold text-muted-foreground">
              {split.km} km
            </Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-glass-strong">
              <View
                className={cn('h-full rounded-full', best ? 'bg-primary' : 'bg-primary/45')}
                style={{ width: `${Math.round((fastest / Math.max(1, split.seconds)) * 100)}%` }}
              />
            </View>
            <Text
              className={cn(
                'w-11 text-right font-display-black text-[0.875rem] tracking-tight',
                best ? 'text-primary-text' : 'text-foreground'
              )}
            >
              {formatPace(split.seconds)}
            </Text>
          </Vidro>
        );
      })}
    </>
  );
}
