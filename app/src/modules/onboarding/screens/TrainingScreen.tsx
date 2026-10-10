import { useState } from 'react';
import { View } from 'react-native';
import { ChipPick } from '@/components/ui/ChipPick';
import { ChoiceTile } from '@/components/ui/ChoiceTile';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { ChipsWithOther, withOther } from '../components/ChipsWithOther';
import { OnboardingFrame, OnboardingLabel, OnboardingTitle } from '../components/OnboardingFrame';
import { useSaveAndContinue } from '../hooks/useSaveAndContinue';
import { nextOnboardingStep } from '../services/onboardingFlow';
import {
  HOME_EQUIPMENT,
  NO_SPORT,
  SESSION_MINUTES,
  SPORTS,
  TRAINING_DAYS,
  TRAINING_PLACES,
} from '../services/routineOptions';
import { toggleExclusive } from '../services/toggleExclusive';
import { useOnboardingStore } from '../store/onboardingStore';

type Minutes = (typeof SESSION_MINUTES)[number]['value'];
type Place = (typeof TRAINING_PLACES)[number]['value'];
const HOME: Place = 'Home gym';

/**
 * O6 · Seu treino (4 de 5): dias, tempo, onde treina, o equipamento de casa e o
 * esporte praticado. "Pular por enquanto" segue com o padrão (#365).
 *
 * Sem dieta pela triagem, O7 não aparece: daqui vai a O8.
 *
 * @example <TrainingScreen />
 */
export function TrainingScreen() {
  const scope = useOnboardingStore((state) => state.scope);
  return scope === 'diet' ? <ExerciseDaysQuestion /> : <TrainingQuestions />;
}

const EXERCISE_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * O6 no caminho "só dieta": só os dias de exercício, que entram no gasto de
 * energia da meta. O resto do treino não muda a dieta, e não é perguntado.
 */
function ExerciseDaysQuestion() {
  const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_atividade');
  const [days, setDays] = useState<number | null>(null);
  const next = nextOnboardingStep('training', useOnboardingStore.getState());

  return (
    <OnboardingFrame
      step={4}
      primary={{
        label: saving ? 'Salvando…' : 'Continuar',
        onPress: () => void saveAndGo({ training_days: days }, next),
        disabled: days === null || saving,
        hint: 'Escolha quantos dias',
      }}
    >
      <OnboardingTitle sub="Entra na conta do quanto você gasta de energia.">
        Quantos dias por semana você se exercita?
      </OnboardingTitle>
      <View className="mt-[1.375rem] flex-row gap-[0.4375rem]" accessibilityRole="radiogroup">
        {EXERCISE_DAYS.map((option) => (
          <ChipPick
            key={option}
            rotulo={String(option)}
            marcado={days === option}
            onPress={() => setDays(option)}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}

function TrainingQuestions() {
  const dietAllowed = useOnboardingStore((state) => state.dietAllowed);
  const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_treino');
  const [days, setDays] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<Minutes | ''>('');
  const [place, setPlace] = useState<Place | null>(null);
  // Começa vazio: com oito opções, marcar tudo presumiria que a pessoa tem
  // kettlebell e banco em casa.
  const [equipment, setEquipment] = useState<string[]>([]);
  const [otherEquipment, setOtherEquipment] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [otherSport, setOtherSport] = useState('');

  const scope = useOnboardingStore((state) => state.scope);
  // Só treino, ou sem dieta pela triagem: O7 não aparece (`onboardingFlow`).
  const next = nextOnboardingStep('training', { scope, dietAllowed });
  const ready = days !== null && minutes !== '' && place !== null;

  function continuar() {
    if (!ready) return;
    void saveAndGo(
      {
        training_days: days,
        training_duration: Number(minutes),
        gym_type: place,
        ...(place === HOME ? { home_equipment: withOther(equipment, otherEquipment) } : {}),
        sports: withOther(sports, otherSport).filter((sport) => sport !== NO_SPORT),
      },
      next
    );
  }

  return (
    <OnboardingFrame
      step={4}
      onSkip={() => void saveAndGo({}, next)}
      primary={{
        label: saving ? 'Salvando…' : 'Continuar',
        onPress: continuar,
        disabled: !ready || saving,
        hint: 'Escolha dias, tempo e onde você treina',
      }}
    >
      <OnboardingTitle sub="Conte o tempo que você tem de verdade.">Seu treino</OnboardingTitle>

      <OnboardingLabel>Dias por semana</OnboardingLabel>
      <View className="flex-row gap-[0.4375rem]" accessibilityRole="radiogroup">
        {TRAINING_DAYS.map((option) => (
          <ChipPick
            key={option}
            rotulo={String(option)}
            marcado={days === option}
            onPress={() => setDays(option)}
          />
        ))}
      </View>

      <OnboardingLabel>Tempo por treino</OnboardingLabel>
      <GlassSegmented<Minutes | ''>
        options={SESSION_MINUTES}
        value={minutes}
        onChange={setMinutes}
      />

      <OnboardingLabel>Onde você treina</OnboardingLabel>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {TRAINING_PLACES.map((option) => (
          <ChoiceTile
            key={option.value}
            icon={option.icon}
            rotulo={option.label}
            marcado={place === option.value}
            onPress={() => setPlace(option.value)}
          />
        ))}
      </View>

      {place === HOME ? (
        <>
          <OnboardingLabel right="marque o que você tem">Equipamento em casa</OnboardingLabel>
          <ChipsWithOther
            options={HOME_EQUIPMENT}
            selected={equipment}
            onToggle={(item) =>
              setEquipment((atual) =>
                atual.includes(item) ? atual.filter((x) => x !== item) : [...atual, item]
              )
            }
            other={otherEquipment}
            onOtherChange={setOtherEquipment}
            otherLabel="Qual equipamento?"
            otherPlaceholder="Ex.: step"
          />
        </>
      ) : null}

      <OnboardingLabel right="opcional">Pratica algum esporte?</OnboardingLabel>
      <ChipsWithOther
        options={SPORTS}
        selected={sports}
        onToggle={(item) => setSports((atual) => toggleExclusive(atual, item, NO_SPORT))}
        other={otherSport}
        onOtherChange={setOtherSport}
        otherLabel="Qual esporte?"
        otherPlaceholder="Ex.: natação"
      />
    </OnboardingFrame>
  );
}
