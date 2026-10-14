import {
  type BlockChanges,
  type BlockChoices,
  INJURY_REGIONS,
  type InjuryRegion,
} from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ChipMulti } from '@/components/ui/ChipMulti';
import { ChipPick } from '@/components/ui/ChipPick';
import { ChoiceTile } from '@/components/ui/ChoiceTile';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { ROUTES } from '@/navigation/types';
import { GOAL_OPTIONS, TRAINING_DAYS, TRAINING_PLACES } from '@/shared/onboarding/choices';
import { ChangeQuestion } from '../components/ChangeQuestion';
import { useBlockChoices } from '../hooks/useBlockReview';
import { useReviewStore } from '../store/reviewStore';

const goalLabel = (goal: BlockChoices['goal']) =>
  GOAL_OPTIONS.find((option) => option.value === goal)?.label.toLowerCase() ?? 'não informado';
const placeLabel = (place: BlockChoices['place']) =>
  TRAINING_PLACES.find((option) => option.value === place)?.label.toLowerCase() ?? place;
const injuriesLabel = (injuries: readonly string[]) =>
  injuries.length > 0 ? injuries.join(', ').toLowerCase() : 'nenhuma';

/**
 * B2 · Mudou alguma coisa? Objetivo, dias, local e dor, cada um com a resposta
 * de hoje. Só o que for marcado como "Mudou" segue para o próximo bloco; nada
 * vai para a anamnese antes de aprovar.
 *
 * @example <ChangesScreen />
 */
export function ChangesScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const { data: today } = useBlockChoices(userId);
  const setChanges = useReviewStore((state) => state.setChanges);
  const [changes, setLocal] = useState<BlockChanges>({});

  function toggle<Key extends keyof BlockChanges>(key: Key, value: BlockChanges[Key] | undefined) {
    setLocal((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function build() {
    setChanges(changes);
    router.push(ROUTES.BLOCK.BUILDING);
  }

  if (!today) {
    return (
      <FlowFrame header={{}}>
        <FlowTitle>Carregando suas respostas…</FlowTitle>
      </FlowFrame>
    );
  }
  return (
    <FlowFrame
      header={{}}
      primary={{ label: 'Montar o próximo bloco', icon: 'sparkles-outline', onPress: build }}
    >
      <FlowTitle sub="Toque em Mudou só no que for diferente.">Mudou alguma coisa?</FlowTitle>
      <View className="mt-4">
        <ChangeQuestion
          icon="flag-outline"
          title="Objetivo"
          current={goalLabel(today.goal)}
          changed={'main_goal' in changes}
          onChange={(on) =>
            toggle('main_goal', on ? (today.goal ?? 'Saúde / Bem-estar') : undefined)
          }
        >
          <View className="gap-[0.4375rem]">
            {GOAL_OPTIONS.map((option) => (
              <ChoiceTile
                key={option.value}
                icon={option.icon}
                label={option.label}
                selected={changes.main_goal === option.value}
                onPress={() => toggle('main_goal', option.value)}
              />
            ))}
          </View>
        </ChangeQuestion>
        <ChangeQuestion
          icon="calendar-outline"
          title="Dias por semana"
          current={`${today.trainingDays} dias`}
          changed={'training_days' in changes}
          onChange={(on) => toggle('training_days', on ? today.trainingDays : undefined)}
        >
          <View className="flex-row gap-[0.4375rem]">
            {TRAINING_DAYS.map((days) => (
              <ChipPick
                key={days}
                label={String(days)}
                selected={changes.training_days === days}
                onPress={() => toggle('training_days', days)}
              />
            ))}
          </View>
        </ChangeQuestion>
        <ChangeQuestion
          icon="location-outline"
          title="Onde você treina"
          current={placeLabel(today.place)}
          changed={'gym_type' in changes}
          onChange={(on) => toggle('gym_type', on ? today.place : undefined)}
        >
          <View className="flex-row gap-[0.4375rem]">
            {TRAINING_PLACES.map((option) => (
              <ChoiceTile
                key={option.value}
                icon={option.icon}
                label={option.label}
                selected={changes.gym_type === option.value}
                onPress={() => toggle('gym_type', option.value)}
              />
            ))}
          </View>
        </ChangeQuestion>
        <ChangeQuestion
          icon="bandage-outline"
          title="Dor ou lesão"
          current={injuriesLabel(today.injuries)}
          changed={'injuries' in changes}
          onChange={(on) => toggle('injuries', on ? [...today.injuries] : undefined)}
        >
          <InjuryPicker
            selected={changes.injuries ?? []}
            onChange={(regions) => toggle('injuries', regions)}
          />
        </ChangeQuestion>
      </View>
    </FlowFrame>
  );
}

/** As regiões, como o onboarding grava; nenhuma marcada é "nenhuma dor". */
function InjuryPicker({
  selected,
  onChange,
}: {
  selected: InjuryRegion[];
  onChange: (regions: InjuryRegion[]) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-[0.4375rem]">
      {INJURY_REGIONS.map((region) => (
        <ChipMulti
          key={region}
          label={region}
          selected={selected.includes(region)}
          onPress={() =>
            onChange(
              selected.includes(region)
                ? selected.filter((item) => item !== region)
                : [...selected, region]
            )
          }
        />
      ))}
    </View>
  );
}
