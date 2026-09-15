import { dataCurtaDoInstante, type ModalityHistory } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Pedestal } from '@/components/ui/Pedestal';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import type { CardioModality } from '../../cardioModalities';
import { CardioHero } from '../../components/cardio/CardioHero';
import { InfoNote } from '../../components/cardio/InfoNote';
import { MetricTile } from '../../components/cardio/MetricTile';
import { Stage } from '../../components/cardio/Stage';
import {
  estimateCalories,
  formatKilometers,
  formatMet,
  formatShortDuration,
} from '../../services/cardioMetrics';

interface ModalityViewProps {
  modality: CardioModality;
  goalMinutes: number | null;
  weightKg: number;
  history: ModalityHistory | null;
  onBack: () => void;
  onGoal: () => void;
  onStart: () => void;
}

const HOUR_MS = 3_600_000;

/**
 * Tela 2 do kit: a modalidade no palco, a intensidade, a duração e o gasto
 * estimado, e o histórico do aluno nela.
 *
 * A "Sessão sugerida" do kit fica de fora: é prescrição, e o cardio livre não
 * tem prescrição (ADR-0026). Volta com o lote da prescrição de cardio.
 *
 * @example
 * <ModalityView modality={cardioModality('bike')} goalMinutes={30} weightKg={74} … />
 */
export function ModalityView(props: ModalityViewProps) {
  const { modality, onBack, onGoal, onStart } = props;

  return (
    <GlassScreen
      glow={CARDIO_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Definir meta', icone: 'timer-outline', onPress: onGoal }}
          principal={{ rotulo: 'Iniciar sessão', icone: 'play', onPress: onStart }}
        />
      }
    >
      <View className="flex-row pt-1.5">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onBack} />
      </View>

      <Stage className="mt-3.5 px-2.5 pb-[1.125rem] pt-2.5">
        <Pedestal size={212} lift={6}>
          <CardioHero kind={modality.heroKind} scale={0.96} />
        </Pedestal>
        <View className="mt-3 items-center">
          <Text className="text-[0.6875rem] font-extrabold uppercase tracking-[0.2em] text-primary-text">
            Cardio livre
          </Text>
          <Text className="mt-[0.1875rem] font-display-black text-[1.9375rem] tracking-tight text-foreground">
            {modality.activityName}
          </Text>
        </View>
        <PlanTiles {...props} />
      </Stage>

      <TituloDeSecao estilo="rotulo">Seu histórico nesta modalidade</TituloDeSecao>
      {props.history ? (
        <HistoryTiles history={props.history} usesGps={modality.usesGps} />
      ) : (
        <InfoNote icon="time-outline">
          {`Sua primeira sessão de ${modality.activityName.toLowerCase()} aparece aqui.`}
        </InfoNote>
      )}
    </GlassScreen>
  );
}

/** Intensidade, duração e gasto. Sem meta, o gasto é por hora: não há duração para estimar. */
function PlanTiles({ modality, goalMinutes, weightKg }: ModalityViewProps) {
  const calories =
    goalMinutes === null
      ? estimateCalories(modality.met, weightKg, HOUR_MS)
      : estimateCalories(modality.met, weightKg, goalMinutes * 60_000);

  return (
    <View className="flex-row gap-[0.5625rem] px-2 pt-3.5">
      <MetricTile
        icon="speedometer-outline"
        value={formatMet(modality.met)}
        unit="MET"
        label="Intensidade"
      />
      <MetricTile
        icon="timer-outline"
        value={goalMinutes === null ? 'Livre' : String(goalMinutes)}
        unit={goalMinutes === null ? undefined : 'min'}
        label="Duração"
      />
      <MetricTile
        icon="flame-outline"
        value={`≈${calories}`}
        unit={goalMinutes === null ? 'kcal/h' : 'kcal'}
        label="Gasto"
      />
    </View>
  );
}

function HistoryTiles({ history, usesGps }: { history: ModalityHistory; usesGps: boolean }) {
  const { last, best, monthDurationSeconds } = history;
  const bestValue =
    usesGps && best.distanceMeters !== null
      ? `${formatKilometers(best.distanceMeters)} km`
      : formatShortDuration(best.durationSeconds ?? 0);

  return (
    <View className="flex-row gap-2.5">
      <HistoryTile
        label="Última"
        value={formatShortDuration(last.durationSeconds ?? 0)}
        detail={dataCurtaDoInstante(last.startedAt)}
      />
      <HistoryTile label="Melhor" value={bestValue} detail={dataCurtaDoInstante(best.startedAt)} />
      <HistoryTile label="Total" value={formatShortDuration(monthDurationSeconds)} detail="Mês" />
    </View>
  );
}

function HistoryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Vidro classeExterna="flex-1" className="p-[0.8125rem]">
      <Text className="text-[0.59375rem] font-bold uppercase tracking-widest text-placeholder">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-[0.3125rem] font-display-black text-[1.0625rem] tracking-tight text-foreground"
      >
        {value}
      </Text>
      <Text className="mt-px text-[0.6875rem] text-muted-foreground">{detail}</Text>
    </Vidro>
  );
}
