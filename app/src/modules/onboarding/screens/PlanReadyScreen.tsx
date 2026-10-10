import type { DietGuard, OnboardingPlanPending, PlanDayOfWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { AdjustSheet } from '../components/AdjustSheet';
import { OnboardingFrame, OnboardingLabel, OnboardingTitle } from '../components/OnboardingFrame';
import { usePlanActions } from '../hooks/usePlanActions';
import { usePlanDraftStore } from '../store/planDraftStore';

const WEEK: { day: PlanDayOfWeek; short: string }[] = [
  { day: 'monday', short: 'Seg' },
  { day: 'tuesday', short: 'Ter' },
  { day: 'wednesday', short: 'Qua' },
  { day: 'thursday', short: 'Qui' },
  { day: 'friday', short: 'Sex' },
  { day: 'saturday', short: 'Sáb' },
  { day: 'sunday', short: 'Dom' },
];

/** Por que a meta ficou onde ficou: a regra decide, a tela só explica (ADR-0044). */
const GUARD_TEXT: Record<DietGuard, string> = {
  bmr_floor: 'Sua meta parou no seu gasto em repouso: abaixo dele, não descemos.',
  weekly_rate_cap: 'Limitamos a perda a cerca de 1% do seu peso por semana.',
  low_bmi_no_loss: 'Seu peso já está abaixo da faixa saudável, então a meta é manter, não perder.',
  lean_mass: 'A proteína saiu da sua massa magra, medida na análise corporal.',
  reference_weight: 'Proteína e gordura saíram de um peso de referência, para a meta não inflar.',
};

/**
 * O9 · Seu plano está pronto: a meta do código, a semana de treino e um dia de
 * exemplo. "Aprovar plano" grava a cópia pendente e conclui o onboarding; antes
 * disso nada está gravado (ADR-0020).
 *
 * @example <PlanReadyScreen />
 */
export function PlanReadyScreen() {
  const router = useRouter();
  const plan = usePlanDraftStore((state) => state.plan);
  const canUndo = usePlanDraftStore((state) => state.canUndo);
  const { approving, adjusting, approve, adjust } = usePlanActions();
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Sem plano na memória AO ABRIR (o app fechou), volta a O8 para gerar de novo.
  // Só na abertura: a aprovação limpa o plano antes de a tela sair, e reagir a
  // essa limpeza mandava a pessoa de volta a O8 e gerava outro plano, em laço.
  const openedWithoutPlan = useRef(plan === null);
  useEffect(() => {
    if (openedWithoutPlan.current) router.replace(ROUTES.ONBOARDING.BUILDING);
  }, [router]);
  if (!plan) return null;

  return (
    <OnboardingFrame
      overlay={
        <>
          <BarraDeDuasAcoes
            semAbas
            secundaria={{
              rotulo: 'Ajustar',
              icone: 'options-outline',
              onPress: () => setAdjustOpen(true),
              desabilitada: approving,
            }}
            principal={{
              rotulo: approving ? 'Aprovando…' : 'Aprovar plano',
              icone: 'checkmark',
              onPress: () => void approve(),
              desabilitada: approving || adjusting,
            }}
          />
          <AdjustSheet
            visible={adjustOpen}
            plan={plan}
            busy={adjusting}
            canUndo={canUndo}
            onAdjust={(adjustment) => void adjust(adjustment)}
            onClose={() => setAdjustOpen(false)}
          />
        </>
      }
    >
      <OnboardingTitle sub="Revise e aprove. Você pode ajustar quando quiser.">
        Seu plano está pronto
      </OnboardingTitle>
      {plan.target ? <TargetCard target={plan.target} /> : null}
      {plan.target && !plan.target.guards.includes('lean_mass') ? <ScanSuggestion /> : null}
      <Week plan={plan} />
      <ExampleDay plan={plan} />
      {plan.estimate ? (
        <InfoNote icon="sparkles-outline" className="mt-3">
          {ESTIMATE_TEXT[plan.estimate]}
        </InfoNote>
      ) : null}
      {plan.proposal.explanation ? (
        <Text className="mt-4 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          {plan.proposal.explanation}
        </Text>
      ) : null}
    </OnboardingFrame>
  );
}

/** O app não tem preço nem tempo de preparo: a escolha é da IA, e a tela diz. */
const ESTIMATE_TEXT = {
  cheaper:
    'Mais barato: os alimentos foram escolhidos pela IA como mais em conta. É estimativa; o app não tem preço.',
  faster:
    'Mais rápido: as refeições foram escolhidas pela IA como de preparo rápido. É estimativa; o app não mede tempo de preparo.',
} as const;

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
        {/* Miolo próprio: no anel de 96 do kit o valor é 0,2 do diâmetro, e o
            rótulo padrão do Anel (feito para o de 168) cortava na borda. */}
        <Anel
          valor={100}
          meta={100}
          rotulo={target.calories.toLocaleString('pt-BR')}
          tamanho={96}
          espessura={9}
        >
          <Text className="font-display-black text-[1.1875rem] leading-[1.25rem] tracking-tight text-hero">
            {target.calories.toLocaleString('pt-BR')}
          </Text>
          <Text className="mt-0.5 text-[0.59375rem] font-bold text-hero-secondary">
            kcal por dia
          </Text>
        </Anel>
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

/**
 * A semana em lista, um dia por linha. As 7 colunas do kit foram desenhadas para
 * rótulos curtos ("Superiores"); os títulos que a IA gera são longos, e nas
 * colunas quebravam e cortavam.
 */
function Week({ plan }: { plan: OnboardingPlanPending }) {
  const regular = plan.proposal.workouts.filter((workout) => !workout.optional).length;
  const days = WEEK.map((entry) => ({
    ...entry,
    workout: plan.proposal.workouts.find((item) => item.day_of_week === entry.day),
  }));
  const free = days.filter((entry) => !entry.workout).map((entry) => entry.short.toLowerCase());

  return (
    <>
      <OnboardingLabel right={`${regular} treinos · ${plan.sessionMinutes} min`}>
        Sua semana de treino
      </OnboardingLabel>
      <Vidro className="px-3.5 py-1">
        {days
          .filter((entry) => entry.workout)
          .map(({ day, short, workout }, index) => (
            <View
              key={day}
              className={cn(
                'flex-row items-center gap-3 py-2.5',
                index > 0 && 'border-t border-glass-border'
              )}
            >
              <View
                className={cn(
                  'h-10 w-11 items-center justify-center rounded-xl',
                  workout?.optional ? 'border border-dashed border-glass-border' : 'bg-primary/15'
                )}
              >
                <Text className="text-[0.75rem] font-extrabold text-hero">{short}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={2} className="text-[0.84375rem] font-bold text-hero">
                  {workout?.title}
                </Text>
                <Text className="mt-0.5 text-[0.71875rem] text-hero-secondary">
                  {workout?.optional
                    ? 'Opcional · do esporte que você marcou'
                    : `${workout?.exercises.length ?? 0} exercícios`}
                </Text>
              </View>
            </View>
          ))}
      </Vidro>
      {free.length > 0 ? (
        <Text className="mt-2 text-[0.71875rem] text-hero-secondary">
          {`Livre: ${free.join(', ')}`}
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

/**
 * Para quem seguiu sem fotos: o escaneamento como uma linha, sem cobrança. Se a
 * pessoa fizer, o plano volta a O8 e é remontado com o % de gordura; nada é
 * gravado até aprovar.
 */
function ScanSuggestion() {
  const router = useRouter();
  return (
    <View className="mt-3">
      <LinhaDeVidro
        icon="scan-outline"
        tom="marca"
        titulo="Afine seu plano com 3 fotos"
        sub="Escaneamento corporal · opcional, cerca de 1 minuto"
        onPress={() =>
          router.push({ pathname: ROUTES.ASSESSMENT.BODY_SCAN, params: { retorno: 'plano' } })
        }
      />
    </View>
  );
}
