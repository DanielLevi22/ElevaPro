import {
  type BlockChanges,
  type BlockChoices,
  INJURY_REGIONS,
  type InjuryRegion,
} from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { ChipMulti } from '@/components/ui/ChipMulti';
import { ChipPick } from '@/components/ui/ChipPick';
import { ChoiceTile } from '@/components/ui/ChoiceTile';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { GOAL_OPTIONS, TRAINING_DAYS, TRAINING_PLACES } from '@/shared/onboarding/choices';
import { ChangeQuestion } from '../components/ChangeQuestion';
import { useBlockChoices, useLevelUpAvailable } from '../hooks/useBlockReview';
import { type ChangeFocus, useReviewStore } from '../store/reviewStore';

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
  const { data: canLevelUp } = useLevelUpAvailable(userId);
  const setChanges = useReviewStore((state) => state.setChanges);
  const early = useReviewStore((state) => state.early);
  const focus = useReviewStore((state) => state.focus);
  const [changes, setLocal] = useState<BlockChanges>({});

  // Vinda de "Mudar meu plano" (C1), a mudança escolhida já abre como "Mudou".
  useEffect(() => {
    if (!today || !focus) return;
    setLocal((current) =>
      focus in current ? current : { ...current, [focus]: currentValue(today, focus) }
    );
  }, [today, focus]);

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
    router.push(early ? ROUTES.BLOCK.EARLY : ROUTES.BLOCK.BUILDING);
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
      primary={{
        label: early ? 'Continuar' : 'Montar o próximo bloco',
        icon: early ? 'arrow-forward' : 'sparkles-outline',
        onPress: build,
        // Antes do fim, mudar o plano sem mudar nada não fecha o bloco à toa.
        disabled: early && Object.keys(changes).length === 0,
        hint: 'Marque o que mudou',
      }}
    >
      <FlowTitle sub="Toque em Mudou só no que for diferente.">Mudou alguma coisa?</FlowTitle>
      <View className="mt-4">
        {canLevelUp && !early ? (
          <LevelUpQuestion
            accepted={changes.level === 'intermediate'}
            onAnswer={(yes) => toggle('level', yes ? 'intermediate' : undefined)}
          />
        ) : null}
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

/**
 * A7 · Subir de nível, como proposta: só muda se a pessoa disser sim, e o
 * próximo bloco já sai no nível novo.
 */
function LevelUpQuestion({
  accepted,
  onAnswer,
}: {
  accepted: boolean;
  onAnswer: (yes: boolean) => void;
}) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" destaque className="gap-2.5 p-[0.8125rem]">
      <View className="flex-row items-center gap-3">
        <CaixaDeIcone icon="trending-up-outline" tom="marca" tamanho="bloco" />
        <View className="flex-1">
          <Text className="text-[0.84375rem] font-bold text-foreground">
            Quer passar para intermediário?
          </Text>
          <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">
            8 semanas com 80% dos treinos feitos.
          </Text>
        </View>
      </View>
      <View className="flex-row gap-[0.4375rem]">
        <ChipPick
          label="Continuar como estou"
          selected={!accepted}
          onPress={() => onAnswer(false)}
        />
        <ChipPick label="Quero subir" selected={accepted} onPress={() => onAnswer(true)} />
      </View>
    </Vidro>
  );
}

/** O valor de hoje, para a pergunta abrir marcada sem mudar nada ainda. */
function currentValue(today: BlockChoices, focus: ChangeFocus): BlockChanges[ChangeFocus] {
  const values: { [Key in ChangeFocus]: BlockChanges[Key] } = {
    main_goal: today.goal ?? 'Saúde / Bem-estar',
    training_days: today.trainingDays,
    gym_type: today.place,
    injuries: [...today.injuries],
  };
  return values[focus];
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
