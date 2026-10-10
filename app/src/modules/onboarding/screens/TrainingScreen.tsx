import { useState } from 'react';
import { View } from 'react-native';
import { ChipPick } from '@/components/ui/ChipPick';
import { ChoiceTile } from '@/components/ui/ChoiceTile';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { ROUTES } from '@/navigation/types';
import { Chips } from '../components/Chips';
import { OnboardingFrame, OnboardingLabel, OnboardingTitle } from '../components/OnboardingFrame';
import { useSaveAndContinue } from '../hooks/useSaveAndContinue';
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
 * Sem dieta pela triagem, O7 não aparece: o onboarding termina aqui.
 *
 * @example <TrainingScreen />
 */
export function TrainingScreen() {
  const dietAllowed = useOnboardingStore((state) => state.dietAllowed);
  const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_treino');
  const [days, setDays] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<Minutes | ''>('');
  const [place, setPlace] = useState<Place | null>(null);
  // "Desmarque o que não tem": começa tudo marcado, como no desenho.
  const [equipment, setEquipment] = useState<string[]>([...HOME_EQUIPMENT]);
  const [sports, setSports] = useState<string[]>([]);

  // O fim provisório até O8 existir: concluir leva à tela inicial.
  const lastStep = dietAllowed === false;
  const next = lastStep ? ROUTES.TABS.ROOT : ROUTES.ONBOARDING.FOOD;
  const ready = days !== null && minutes !== '' && place !== null;

  function continuar() {
    if (!ready) return;
    void saveAndGo(
      {
        training_days: days,
        training_duration: Number(minutes),
        gym_type: place,
        ...(place === HOME ? { home_equipment: equipment } : {}),
        sports: sports.filter((sport) => sport !== NO_SPORT),
      },
      next,
      lastStep
    );
  }

  return (
    <OnboardingFrame
      step={4}
      onSkip={() => void saveAndGo({}, next, lastStep)}
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
          <OnboardingLabel right="desmarque o que não tem">Equipamento em casa</OnboardingLabel>
          <Chips
            options={HOME_EQUIPMENT}
            selected={equipment}
            onToggle={(item) =>
              setEquipment((atual) =>
                atual.includes(item) ? atual.filter((x) => x !== item) : [...atual, item]
              )
            }
          />
        </>
      ) : null}

      <OnboardingLabel right="opcional">Pratica algum esporte?</OnboardingLabel>
      <Chips
        options={SPORTS}
        selected={sports}
        onToggle={(item) => setSports((atual) => toggleExclusive(atual, item, NO_SPORT))}
      />
    </OnboardingFrame>
  );
}
