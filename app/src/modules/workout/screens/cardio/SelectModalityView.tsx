import type { LastCardio } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import {
  CARDIO_MODALITIES,
  type CardioModality,
  modalityByActivityName,
} from '../../cardioModalities';
import { formatMet } from '../../services/cardioMetrics';
import type { CardioModalityId } from '../../store/cardioSessionMachine';

interface SelectModalityViewProps {
  lastCardio: LastCardio | null;
  onBack: () => void;
  onHistory: () => void;
  onChoose: (modalityId: CardioModalityId) => void;
  onRepeat: (modalityId: CardioModalityId, goalMinutes: number | null) => void;
}

/** O kit põe as cinco em duas colunas, e a quinta ocupa a linha inteira. */
const ROWS: readonly (readonly CardioModality[])[] = [
  CARDIO_MODALITIES.slice(0, 2),
  CARDIO_MODALITIES.slice(2, 4),
  CARDIO_MODALITIES.slice(4),
];

/**
 * Tela 1 do kit: "Cardio — Escolha sua atividade", com o "Repetir a última" no
 * topo e as cinco modalidades. A modalidade da última sessão fica em destaque.
 *
 * @example
 * <SelectModalityView lastCardio={last} onChoose={escolher} onRepeat={repetir} … />
 */
export function SelectModalityView({
  lastCardio,
  onBack,
  onHistory,
  onChoose,
  onRepeat,
}: SelectModalityViewProps) {
  const last = lastCardio ? modalityByActivityName(lastCardio.activityName) : null;

  return (
    <GlassScreen glow={CARDIO_GLOW}>
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onBack} />
        <View className="min-w-0 flex-1">
          <Text className="text-[1.6875rem] font-bold tracking-tight text-hero">Cardio</Text>
          <Text className="mt-px text-[0.78125rem] text-hero-secondary">Escolha sua atividade</Text>
        </View>
        <BotaoRedondo icone="history" rotulo="Histórico de sessões" onPress={onHistory} />
      </View>

      {last && lastCardio ? (
        <RepeatLastCard modality={last} lastCardio={lastCardio} onRepeat={onRepeat} />
      ) : null}

      <TituloDeSecao estilo="rotulo" acao={`${CARDIO_MODALITIES.length} modalidades`}>
        Modalidades
      </TituloDeSecao>
      <View className="gap-2.5">
        {ROWS.map((row) => (
          <View key={row[0].id} className="flex-row gap-2.5">
            {row.map((modality) => (
              <ModalityCard
                key={modality.id}
                modality={modality}
                highlighted={modality.id === last?.id}
                onPress={() => onChoose(modality.id)}
              />
            ))}
          </View>
        ))}
      </View>

      <TituloDeSecao estilo="rotulo">Como funciona</TituloDeSecao>
      <InfoNote icon="information-circle-outline">
        Sessão livre: o app cronometra o tempo e estima as calorias pelo MET da atividade e seu peso
        atual.
      </InfoNote>
    </GlassScreen>
  );
}

const REPEAT_ICON = 18;
const CHEVRON = 17;

function RepeatLastCard({
  modality,
  lastCardio,
  onRepeat,
}: {
  modality: CardioModality;
  lastCardio: LastCardio;
  onRepeat: SelectModalityViewProps['onRepeat'];
}) {
  const cores = useCores();
  const escalar = useEscala();
  const minutes =
    lastCardio.durationSeconds === null ? null : Math.round(lastCardio.durationSeconds / 60);
  const description = minutes ? `${modality.activityName} · ${minutes} min` : modality.activityName;

  return (
    <TouchableOpacity
      onPress={() => onRepeat(modality.id, minutes || null)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Repetir a última: ${description}`}
      className="mt-[1.125rem]"
    >
      <Vidro className="flex-row items-center gap-[0.8125rem] p-3.5">
        <View className="h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-[0.8125rem] bg-primary/20">
          <Ionicons name="repeat" size={escalar(REPEAT_ICON)} color={cores.primaryText} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.65625rem] font-extrabold uppercase tracking-widest text-primary-text">
            Repetir a última
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-[0.90625rem] font-bold tracking-tight text-foreground"
          >
            {description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={escalar(CHEVRON)} color={cores.placeholder} />
      </Vidro>
    </TouchableOpacity>
  );
}

const MODALITY_ICON = 20;

function ModalityCard({
  modality,
  highlighted,
  onPress,
}: {
  modality: CardioModality;
  highlighted: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${modality.activityName}, cerca de ${formatMet(modality.met)} METs`}
      className="flex-1"
    >
      <Vidro destaque={highlighted} className="h-[8.625rem] justify-between p-3.5">
        <View
          className={cn(
            'h-10 w-10 items-center justify-center rounded-[0.875rem]',
            highlighted ? 'bg-primary' : 'bg-glass-strong'
          )}
        >
          <Ionicons
            name={modality.icon}
            size={escalar(MODALITY_ICON)}
            color={highlighted ? cores.primaryForeground : cores.mutedForeground}
          />
        </View>
        <View>
          <Text className="font-display-black text-[1.0625rem] tracking-tight text-foreground">
            {modality.activityName}
          </Text>
          <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">
            ~{formatMet(modality.met)} METs
          </Text>
        </View>
      </Vidro>
    </TouchableOpacity>
  );
}
