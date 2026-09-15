import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import type { CardioModality } from '../../cardioModalities';
import { InfoNote } from '../../components/cardio/InfoNote';
import { Stage } from '../../components/cardio/Stage';
import { estimateCalories, formatMet } from '../../services/cardioMetrics';
import type { CardioModalityId } from '../../store/cardioSessionMachine';

interface GoalViewProps {
  modality: CardioModality;
  goalMinutes: number | null;
  weightKg: number;
  onBack: () => void;
  onConfirm: (minutes: number | null) => void;
}

const PRESETS = [10, 15, 20, 30, 45, 60] as const;
const PRESET_ROWS = [PRESETS.slice(0, 3), PRESETS.slice(3)] as const;
/** A meta que abre selecionada quando ainda não há nenhuma: o preset do kit. */
const DEFAULT_GOAL = 30;
/** Cinco horas: acima disso é engano de digitação, não meta. */
const MAX_GOAL = 300;

function isValidGoal(digits: string): boolean {
  const minutes = Number.parseInt(digits, 10);
  return minutes > 0 && minutes <= MAX_GOAL;
}

/** "Você pode continuar pedalando" — o verbo de cada modalidade. */
const KEEP_GOING: Record<CardioModalityId, string> = {
  walk: 'caminhando',
  run: 'correndo',
  bike: 'pedalando',
  elliptical: 'no elíptico',
  swim: 'nadando',
};

/**
 * Tela 3 do kit: a duração alvo, os presets, o campo livre e o aviso de que a
 * meta vibra. "Sem meta" deixa a sessão livre; "Pular" volta sem mudar nada.
 *
 * @example
 * <GoalView modality={bike} goalMinutes={null} weightKg={74} onConfirm={confirmar} onBack={voltar} />
 */
export function GoalView({ modality, goalMinutes, weightKg, onBack, onConfirm }: GoalViewProps) {
  const [draft, setDraft] = useState<number | null>(goalMinutes ?? DEFAULT_GOAL);
  const [typed, setTyped] = useState('');

  const choosePreset = (minutes: number | null) => {
    setDraft(minutes);
    setTyped('');
  };
  const type = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setTyped(digits);
    if (isValidGoal(digits)) setDraft(Number.parseInt(digits, 10));
  };
  // "0" ou "900" digitados não podem confirmar em silêncio a meta anterior.
  const typedInvalid = typed !== '' && !isValidGoal(typed);

  return (
    <GlassScreen
      glow={CARDIO_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Pular', icone: 'play-skip-forward', onPress: onBack }}
          principal={{
            rotulo: 'Confirmar meta',
            icone: 'checkmark',
            desabilitada: typedInvalid,
            onPress: () => onConfirm(draft),
          }}
        />
      }
    >
      <GoalHeader modality={modality} onBack={onBack} />
      <GoalStage modality={modality} minutes={draft} weightKg={weightKg} />

      <TituloDeSecao estilo="rotulo" acao="Sem meta" onAcao={() => choosePreset(null)}>
        Presets
      </TituloDeSecao>
      <View className="gap-[0.5625rem]">
        {PRESET_ROWS.map((row) => (
          <View key={row[0]} className="flex-row gap-[0.5625rem]">
            {row.map((minutes) => (
              <PresetButton
                key={minutes}
                minutes={minutes}
                selected={draft === minutes && typed === ''}
                onPress={() => choosePreset(minutes)}
              />
            ))}
          </View>
        ))}
      </View>

      <TituloDeSecao estilo="rotulo">Ou digite</TituloDeSecao>
      <MinutesInput value={typed} onChange={type} />
      <InfoNote icon="notifications-outline" className="mt-2.5">
        {`Avisamos com vibração ao bater a meta. Você pode continuar ${KEEP_GOING[modality.id]} depois disso.`}
      </InfoNote>
    </GlassScreen>
  );
}

const HEADER_ICON = 18;
const INPUT_ICON = 17;

function GoalHeader({ modality, onBack }: { modality: CardioModality; onBack: () => void }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onBack} />
      <View className="min-w-0 flex-1">
        <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
          {modality.activityName}
        </Text>
        <Text className="mt-0.5 text-[1.3125rem] font-bold tracking-tight text-hero">
          Meta de tempo
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-[2.375rem] w-[2.375rem] items-center justify-center rounded-full border border-hero-chip-border bg-hero-chip"
      >
        <Ionicons name={modality.icon} size={escalar(HEADER_ICON)} color={cores.onHero} />
      </View>
    </View>
  );
}

function GoalStage({
  modality,
  minutes,
  weightKg,
}: {
  modality: CardioModality;
  minutes: number | null;
  weightKg: number;
}) {
  const note =
    minutes === null
      ? 'Sem meta: você encerra quando quiser.'
      : `≈ ${estimateCalories(modality.met, weightKg, minutes * 60_000)} kcal para ${Math.round(weightKg)} kg a ${formatMet(modality.met)} MET`;

  return (
    <Stage className="mt-[1.125rem] items-center px-[1.125rem] py-[1.625rem]">
      <Text className="text-[0.6875rem] font-extrabold uppercase tracking-[0.2em] text-placeholder">
        Duração alvo
      </Text>
      <View className="mt-2 flex-row items-baseline gap-2">
        <Text className="font-display-black text-[4.5rem] leading-[4.5rem] tracking-tighter text-foreground">
          {minutes === null ? 'Livre' : minutes}
        </Text>
        {minutes === null ? null : (
          <Text className="text-[1.25rem] font-bold text-primary-text">min</Text>
        )}
      </View>
      <Text className="mt-2.5 text-[0.78125rem] text-muted-foreground">{note}</Text>
    </Stage>
  );
}

/** `0 10px 26px -10px` da primária no preset escolhido. */
const PRESET_GLOW = { y: 10, blur: 26, espalhamento: -10 } as const;

function PresetButton({
  minutes,
  selected,
  onPress,
}: {
  minutes: number;
  selected: boolean;
  onPress: () => void;
}) {
  const brilho = useBrilho();
  const content = (
    <>
      <Text
        className={cn(
          'font-display-black text-[1.1875rem] tracking-tight',
          selected ? 'text-primary-foreground' : 'text-foreground'
        )}
      >
        {minutes}
      </Text>
      <Text
        className={cn(
          'text-[0.59375rem] font-bold uppercase tracking-widest',
          selected ? 'text-primary-foreground' : 'text-placeholder'
        )}
      >
        min
      </Text>
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${minutes} minutos`}
      accessibilityState={{ selected }}
      className="flex-1"
    >
      {selected ? (
        <View
          className="h-14 items-center justify-center rounded-[1.125rem] bg-primary"
          style={{ boxShadow: brilho(PRESET_GLOW) }}
        >
          {content}
        </View>
      ) : (
        <Vidro
          className="h-14 items-center justify-center rounded-[1.125rem]"
          classeExterna="rounded-[1.125rem]"
        >
          {content}
        </Vidro>
      )}
    </TouchableOpacity>
  );
}

function MinutesInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro
      classeExterna="rounded-2xl"
      className="h-[3.25rem] flex-row items-center gap-2.5 rounded-2xl px-[0.9375rem]"
    >
      <Ionicons name="timer-outline" size={escalar(INPUT_ICON)} color={cores.placeholder} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Minutos"
        placeholderTextColor={cores.placeholder}
        keyboardType="number-pad"
        maxLength={3}
        accessibilityLabel="Meta em minutos"
        className="flex-1 text-[0.875rem] text-foreground"
      />
      <Text className="text-[0.8125rem] font-bold text-placeholder">min</Text>
    </Vidro>
  );
}
