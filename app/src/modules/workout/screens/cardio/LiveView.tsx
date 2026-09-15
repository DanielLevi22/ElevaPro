import { formatarDuracao } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { cn } from '@/lib/utils';
import type { CardioModality } from '../../cardioModalities';
import { CardioGauge } from '../../components/cardio/CardioGauge';
import { IntensityBars } from '../../components/cardio/IntensityBars';
import { LapList } from '../../components/cardio/LapList';
import { inRowsOfThree, liveTiles } from '../../components/cardio/liveTiles';
import { MetricTile } from '../../components/cardio/MetricTile';
import { ControlesDoCronometro } from '../../components/sessao/PecasDoCronometro';
import type { MovementIntensity } from '../../hooks/useMovementIntensity';
import { useMusicApp } from '../../hooks/useMusicApp';
import type { CardioReading } from '../../services/cardioMetrics';
import { type CardioSessionState, lapSummaries } from '../../store/cardioSessionMachine';

export interface LiveViewProps {
  modality: CardioModality;
  session: CardioSessionState;
  reading: CardioReading;
  intensity: MovementIntensity;
  onLeave: () => void;
  onPause: () => void;
  onResume: () => void;
  onLap: () => void;
  onFinish: () => void;
  onOpenRoute: () => void;
}

const HOUR_MS = 3_600_000;
/** Os lugares vazios de uma fila de três: no máximo dois. */
const EMPTY_SLOTS = ['vazio-1', 'vazio-2'] as const;

/**
 * Telas 4 e 5 do kit: a sessão ao vivo e a pausa.
 *
 * Ao vivo, o mostrador com o tempo, a intensidade, os blocos da modalidade e os
 * controles — finalizar, pausar e marcar volta. Pausada, o mostrador apaga, as
 * voltas aparecem e o rodapé oferece finalizar ou retomar.
 *
 * O kit tem Travar, elevação e FC ao vivo; ficaram de fora deste corte (#304).
 *
 * @example <LiveView modality={run} session={session} reading={reading} … />
 */
export function LiveView(props: LiveViewProps) {
  const { session, modality, reading, onFinish, onResume } = props;
  const paused = session.moment === 'paused';

  return (
    <GlassScreen
      glow={CARDIO_GLOW}
      bottomSpace={paused ? 'actionBar' : 'tab'}
      overlay={
        paused ? (
          <BarraDeDuasAcoes
            secundaria={{ rotulo: 'Finalizar', icone: 'stop', onPress: onFinish }}
            principal={{ rotulo: 'Retomar', icone: 'play', onPress: onResume }}
          />
        ) : null
      }
    >
      <LiveHeader {...props} paused={paused} />
      <SessionGauge session={session} reading={reading} paused={paused} />
      {paused ? null : <IntensityBars intensity={props.intensity} />}
      <View className="mt-2.5 gap-[0.5625rem]">
        {inRowsOfThree(liveTiles(modality, reading)).map((row) => (
          <View key={row[0].metric} className="flex-row gap-[0.5625rem]">
            {row.map(({ metric, ...tile }) => (
              <MetricTile key={metric} {...tile} />
            ))}
            {/* Fila incompleta guarda o lugar: um bloco sozinho não estica. */}
            {EMPTY_SLOTS.slice(0, 3 - row.length).map((slot) => (
              <View key={slot} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
      {/* Ao vivo, os controles vêm antes do percurso: é o que precisa caber na tela
          sem rolar, acima da tab bar. */}
      {paused ? <RouteRow {...props} /> : null}
      {paused ? (
        <LapList laps={lapSummaries(session, modality.usesGps ? reading.distanceMeters : null)} />
      ) : (
        <ControlesDoCronometro
          correndo
          rotuloParado="Retomar"
          onAlternar={props.onPause}
          esquerda={{ icone: 'stop', rotulo: 'Finalizar', onPress: onFinish }}
          direita={{
            icone: 'flag',
            rotulo: 'Volta',
            descricao: 'Marcar uma volta',
            onPress: props.onLap,
          }}
        />
      )}
      {paused ? null : <RouteRow {...props} />}
    </GlassScreen>
  );
}

function RouteRow({ modality, onOpenRoute }: LiveViewProps) {
  if (!modality.usesGps) return null;
  return (
    <View className="mt-4">
      <LinhaDeVidro
        icon="map-outline"
        tom="ritmo"
        titulo="Percurso"
        sub="Traçado e parciais por km"
        onPress={onOpenRoute}
      />
    </View>
  );
}

function LiveHeader({ modality, paused, onLeave }: LiveViewProps & { paused: boolean }) {
  const openMusic = useMusicApp();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      {/* Minimiza, como o chevron do kit: a aba do cardio fica montada e a sessão
          segue contando até o aluno voltar e finalizar. */}
      <BotaoRedondo icone="chevron-down" rotulo="Minimizar a sessão" onPress={onLeave} />
      <View className="min-w-0 flex-1 items-center">
        <Text
          className={cn(
            'text-[0.65625rem] font-extrabold uppercase tracking-[0.18em]',
            paused ? 'text-placeholder' : 'text-primary-text'
          )}
        >
          {paused ? 'Pausado' : 'Em andamento'}
        </Text>
        <Text className="mt-px text-[0.96875rem] font-bold tracking-tight text-hero">
          {modality.activityName}
        </Text>
      </View>
      {openMusic ? (
        <BotaoRedondo icone="musical-notes" rotulo="Abrir o app de música" onPress={openMusic} />
      ) : (
        <View className="h-[2.375rem] w-[2.375rem]" />
      )}
    </View>
  );
}

function SessionGauge({
  session,
  reading,
  paused,
}: {
  session: CardioSessionState;
  reading: CardioReading;
  paused: boolean;
}) {
  const { elapsedMs } = reading;
  const progress = gaugeProgress(session, elapsedMs);
  const time = formatarDuracao(elapsedMs / 1000);

  return (
    <CardioGauge
      progress={progress}
      label={`Tempo ${time}`}
      size={paused ? 196 : 222}
      stroke={paused ? 14 : 15}
      paused={paused}
    >
      <Text className="text-[0.65625rem] font-extrabold uppercase tracking-[0.2em] text-placeholder">
        Tempo
      </Text>
      <Text
        className={cn(
          'mt-[0.1875rem] font-display-black tracking-tighter text-foreground',
          paused ? 'text-[2.625rem] leading-[2.75rem]' : 'text-[2.875rem] leading-[3rem]'
        )}
      >
        {time}
      </Text>
      <Text className="mt-[0.1875rem] text-[0.71875rem] text-muted-foreground">
        {gaugeLegend(session, elapsedMs, paused)}
      </Text>
    </CardioGauge>
  );
}

/** Com meta, o mostrador enche até ela; sem meta, dá uma volta por hora. */
function gaugeProgress(session: CardioSessionState, elapsedMs: number): number {
  if (session.goalMinutes === null) return (elapsedMs % HOUR_MS) / HOUR_MS;
  return Math.min(1, elapsedMs / (session.goalMinutes * 60_000));
}

function gaugeLegend(session: CardioSessionState, elapsedMs: number, paused: boolean): string {
  if (session.goalMinutes === null) return 'Sessão livre';
  const goalMs = session.goalMinutes * 60_000;
  if (session.goalReachedAt !== null || elapsedMs >= goalMs) return 'Meta batida';
  if (paused) return `faltam ${formatarDuracao((goalMs - elapsedMs) / 1000)}`;
  return `de ${formatarDuracao(goalMs / 1000)} · ${Math.round((elapsedMs / goalMs) * 100)}%`;
}
