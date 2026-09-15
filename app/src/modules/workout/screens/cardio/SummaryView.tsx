import {
  DIAS_DA_SEMANA,
  doisDigitos,
  formatarDuracao,
  MESES_POR_EXTENSO,
  type SessionVitals,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useEscala } from '@/shared/design';
import type { CardioModality } from '../../cardioModalities';
import { HeartRateZones } from '../../components/cardio/HeartRateZones';
import { InfoNote } from '../../components/cardio/InfoNote';
import { type MetricTone, useToneColor } from '../../components/cardio/MetricTile';
import type { CardioReading } from '../../services/cardioMetrics';
import { formatKilometers } from '../../services/cardioMetrics';

interface SummaryViewProps {
  modality: CardioModality;
  reading: CardioReading;
  startedAt: number;
  goalMinutes: number | null;
  goalReached: boolean;
  /** Só com consentimento vigente: sem ele, nem a média nem as zonas aparecem. */
  vitals: SessionVitals | null;
  declaresMedication: boolean;
  onBack: () => void;
  onHistory: () => void;
  onShare: () => void;
}

/**
 * Tela 8 do kit: o cardio finalizado, com duração, gasto, distância, FC média e
 * o tempo em cada zona.
 *
 * Os "Ganhos" e o "Coach IA" do kit ficam de fora deste corte (#304). As zonas
 * vêm de 220 − idade, e a anamnese com medicação contínua ganha o aviso: beta-
 * bloqueador derruba a FC, e a zona sairia mais baixa do que o esforço foi.
 *
 * @example <SummaryView modality={run} reading={reading} vitals={vitals} … />
 */
export function SummaryView(props: SummaryViewProps) {
  const { modality, vitals, declaresMedication, onBack, onHistory, onShare } = props;

  return (
    <GlassScreen
      glow={CARDIO_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Ver histórico', icone: 'time-outline', onPress: onHistory }}
          principal={{ rotulo: 'Compartilhar', icone: 'share-outline', onPress: onShare }}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar ao cardio" onPress={onBack} />
        <BotaoRedondo icone="share-outline" rotulo="Compartilhar" onPress={onShare} />
      </View>
      <View className="items-start pt-[1.375rem]">
        <Chip tom="destaque">Cardio finalizado</Chip>
        <Text className="mt-3 font-display-black text-[1.9375rem] uppercase leading-[2.125rem] tracking-tight text-hero">
          {modality.activityName}
        </Text>
        <Text className="mt-[0.4375rem] text-[0.84375rem] text-hero-secondary">
          {dateLine(props.startedAt, props.goalMinutes, props.goalReached)}
        </Text>
      </View>

      <StatGrid {...props} />

      {vitals?.zones ? (
        <>
          <TituloDeSecao estilo="rotulo" acao="Da sessão">
            Zonas de esforço
          </TituloDeSecao>
          <HeartRateZones zones={vitals.zones} />
          {declaresMedication ? (
            <InfoNote icon="medkit-outline" className="mt-2.5">
              Sua anamnese registra medicação contínua. Alguns remédios mudam a frequência cardíaca,
              e as zonas podem não refletir o esforço real.
            </InfoNote>
          ) : null}
        </>
      ) : null}
    </GlassScreen>
  );
}

/**
 * "Terça, 12 de agosto · 07:05 · meta batida".
 *
 * @example dateLine(Date.parse('2026-08-12T10:05:00Z'), 30, true)
 */
function dateLine(startedAt: number, goalMinutes: number | null, goalReached: boolean): string {
  const date = new Date(startedAt);
  const parts = [
    `${DIAS_DA_SEMANA[date.getDay()]}, ${date.getDate()} de ${MESES_POR_EXTENSO[date.getMonth()]}`,
    `${doisDigitos(date.getHours())}:${doisDigitos(date.getMinutes())}`,
  ];
  if (goalMinutes !== null) parts.push(goalReached ? 'meta batida' : `meta de ${goalMinutes} min`);
  return parts.join(' · ');
}

interface Stat {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: MetricTone;
}

function stats({ modality, reading, vitals }: SummaryViewProps): Stat[] {
  const list: Stat[] = [
    {
      icon: 'timer-outline',
      label: 'Duração',
      value: formatarDuracao(reading.elapsedMs / 1000),
      tone: 'primary',
    },
    {
      icon: 'flame-outline',
      label: 'Calorias',
      value: `${Math.round(reading.calories)} kcal`,
      tone: 'primary',
    },
  ];
  if (modality.usesGps && reading.distanceMeters > 0) {
    list.push({
      icon: 'map-outline',
      label: 'Distância',
      value: `${formatKilometers(reading.distanceMeters)} km`,
      tone: 'pace',
    });
  }
  if (vitals) {
    list.push({
      icon: 'pulse-outline',
      label: 'FC média',
      value: `${vitals.avgHeartRate} bpm`,
      tone: 'heart',
    });
  }
  return list;
}

function StatGrid(props: SummaryViewProps) {
  const list = stats(props);
  const rows = [list.slice(0, 2), list.slice(2, 4)].filter((row) => row.length > 0);

  return (
    <View className="mt-5 gap-2.5">
      {rows.map((row) => (
        <View key={row[0].label} className="flex-row gap-2.5">
          {row.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

const STAT_ICON = 15;

function StatCard({ icon, label, value, tone }: Stat) {
  const escalar = useEscala();
  const color = useToneColor(tone);

  return (
    <Vidro
      classeExterna="flex-1"
      className="p-3.5"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View className="mb-2.5 h-[1.875rem] w-[1.875rem] items-center justify-center rounded-[0.625rem] bg-glass-strong">
        <Ionicons name={icon} size={escalar(STAT_ICON)} color={color} />
      </View>
      <Text className="font-display-black text-[1.25rem] tracking-tight text-foreground">
        {value}
      </Text>
      <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">{label}</Text>
    </Vidro>
  );
}
