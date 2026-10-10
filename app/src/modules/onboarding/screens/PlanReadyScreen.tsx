import type { DietGuard, OnboardingPlanPending, PlanDayOfWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Anel } from '@/components/ui/Anel';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { OnboardingFrame, OnboardingLabel, OnboardingTitle } from '../components/OnboardingFrame';
import { saveOnboardingAnswers } from '../services/onboardingAnswers';
import { approveOnboardingPlan } from '../services/planService';
import { usePlanDraftStore } from '../store/planDraftStore';

const WEEK: { day: PlanDayOfWeek; letter: string }[] = [
  { day: 'monday', letter: 'S' },
  { day: 'tuesday', letter: 'T' },
  { day: 'wednesday', letter: 'Q' },
  { day: 'thursday', letter: 'Q' },
  { day: 'friday', letter: 'S' },
  { day: 'saturday', letter: 'S' },
  { day: 'sunday', letter: 'D' },
];

/** Por que a meta ficou onde ficou: a regra decide, a tela só explica (ADR-0044). */
const GUARD_TEXT: Record<DietGuard, string> = {
  bmr_floor: 'Sua meta parou no seu gasto em repouso: abaixo dele, não descemos.',
  weekly_rate_cap: 'Limitamos a perda a cerca de 1% do seu peso por semana.',
  low_bmi_no_loss: 'Seu peso já está abaixo da faixa saudável, então a meta é manter, não perder.',
  reference_weight: 'Proteína e gordura saíram de um peso de referência, para a meta não inflar.',
};

/**
 * O9 · Seu plano está pronto: a meta do código, a semana de treino e um dia de
 * exemplo. "Aprovar plano" grava a cópia pendente e conclui o onboarding; antes
 * disso nada está gravado (ADR-0020).
 *
 * "Ajustar" (O10) ainda não existe, e por isso não aparece.
 *
 * @example <PlanReadyScreen />
 */
export function PlanReadyScreen() {
  const router = useRouter();
  const plan = usePlanDraftStore((state) => state.plan);
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [saving, setSaving] = useState(false);

  // Sem plano na memória (o app fechou), volta a O8 para gerar de novo.
  useEffect(() => {
    if (!plan) router.replace(ROUTES.ONBOARDING.BUILDING);
  }, [plan, router]);
  if (!plan) return null;

  async function aprovar() {
    if (!userId) return;
    setSaving(true);
    try {
      await approveOnboardingPlan();
      // Concluir a anamnese é o que tira a pessoa do guarda de rotas.
      await saveOnboardingAnswers(userId, {}, { complete: true });
      usePlanDraftStore.getState().setPlan(null);
      router.replace(ROUTES.ONBOARDING.HEALTH_CONNECT);
    } catch {
      registrarFalha('onboarding.aprovar_plano');
      showAlert({
        title: 'Não foi possível aprovar',
        message: 'Seu plano continua aqui. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingFrame
      primary={{
        label: saving ? 'Aprovando…' : 'Aprovar plano',
        icon: 'checkmark',
        onPress: () => void aprovar(),
        disabled: saving,
      }}
    >
      <OnboardingTitle sub="Revise e aprove. Você pode ajustar quando quiser.">
        Seu plano está pronto
      </OnboardingTitle>
      {plan.target ? <TargetCard target={plan.target} /> : null}
      <Week plan={plan} />
      <ExampleDay plan={plan} />
      {plan.proposal.explanation ? (
        <Text className="mt-4 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          {plan.proposal.explanation}
        </Text>
      ) : null}
    </OnboardingFrame>
  );
}

function TargetCard({ target }: { target: NonNullable<OnboardingPlanPending['target']> }) {
  const macros = [
    {
      label: 'Proteína',
      grams: target.protein,
      kcal: target.protein * 4,
      tom: 'proteina' as const,
    },
    {
      label: 'Carboidrato',
      grams: target.carbs,
      kcal: target.carbs * 4,
      tom: 'carboidrato' as const,
    },
    { label: 'Gordura', grams: target.fat, kcal: target.fat * 9, tom: 'gordura' as const },
  ];
  return (
    <>
      <Vidro classeExterna="mt-4" className="flex-row items-center gap-3.5 p-3">
        <Anel
          valor={100}
          meta={100}
          rotulo={target.calories.toLocaleString('pt-BR')}
          sub="kcal / dia"
          tamanho={96}
          espessura={9}
        />
        <View className="flex-1 gap-[0.5625rem]">
          {macros.map((macro) => (
            <View key={macro.label}>
              <View className="mb-1 flex-row justify-between">
                <Text className="text-[0.71875rem] font-semibold text-hero-secondary">
                  {macro.label}
                </Text>
                <Text className="text-xs font-extrabold text-hero">{`${macro.grams} g`}</Text>
              </View>
              <BarraDeProgresso
                percentual={Math.round((macro.kcal / target.calories) * 100)}
                tom={macro.tom}
                espessura="fina"
              />
            </View>
          ))}
        </View>
      </Vidro>
      {target.guards.map((guard) => (
        <Text key={guard} className="mt-2 text-[0.71875rem] leading-[1rem] text-hero-secondary">
          {GUARD_TEXT[guard]}
        </Text>
      ))}
    </>
  );
}

function Week({ plan }: { plan: OnboardingPlanPending }) {
  const regular = plan.proposal.workouts.filter((workout) => !workout.optional).length;
  const optional = plan.proposal.workouts.find((workout) => workout.optional);
  return (
    <>
      <OnboardingLabel right={`${regular} treinos · ${plan.sessionMinutes} min`}>
        Sua semana de treino
      </OnboardingLabel>
      <Vidro className="flex-row gap-[0.3125rem] p-2.5">
        {WEEK.map(({ day, letter }) => {
          const workout = plan.proposal.workouts.find((item) => item.day_of_week === day);
          return (
            <View
              key={day}
              className={cn(
                'flex-1 items-center rounded-xl px-0.5 py-2',
                workout && !workout.optional && 'border border-glass-border bg-primary/15',
                workout?.optional && 'border border-dashed border-glass-border'
              )}
            >
              <Text className="text-[0.6875rem] font-extrabold text-hero">{letter}</Text>
              <Text
                numberOfLines={2}
                className={cn(
                  'mt-1 min-h-5 text-center text-[0.53125rem] font-semibold leading-[0.65rem]',
                  workout ? 'text-hero-secondary' : 'text-placeholder'
                )}
              >
                {workout?.title ?? 'Livre'}
              </Text>
              {workout?.optional ? (
                <Text className="mt-0.5 font-mono text-[0.46875rem] font-bold uppercase text-hero-secondary">
                  opcional
                </Text>
              ) : null}
            </View>
          );
        })}
      </Vidro>
      {optional ? (
        <Text className="mt-2 text-[0.71875rem] text-hero-secondary">
          {`${optional.title}: opcional, vem do esporte que você marcou.`}
        </Text>
      ) : null}
    </>
  );
}

function ExampleDay({ plan }: { plan: OnboardingPlanPending }) {
  const meals = plan.proposal.meals;
  if (!plan.target || !meals) {
    return (
      <InfoNote icon="restaurant-outline" className="mt-5">
        Sem dieta por enquanto: pela sua triagem, a alimentação pede um especialista. Seu treino
        segue normal.
      </InfoNote>
    );
  }
  const total = plan.mealCalories.reduce((soma, kcal) => soma + kcal, 0);
  return (
    <>
      <OnboardingLabel right={`${total.toLocaleString('pt-BR')} kcal`}>
        Um dia de exemplo
      </OnboardingLabel>
      {meals.map((meal, index) => (
        <LinhaDeVidro
          key={`${meal.name}-${meal.meal_time}`}
          icon="restaurant-outline"
          tom="marca"
          titulo={meal.name}
          sub={meal.items.map((item) => item.food_name).join(', ')}
          direita={
            <Text className="text-xs font-extrabold text-hero">
              {plan.mealCalories[index] ?? 0}
              <Text className="font-semibold text-placeholder"> kcal</Text>
            </Text>
          }
        />
      ))}
    </>
  );
}
