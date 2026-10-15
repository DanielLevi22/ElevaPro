import type { SimplerDietPending } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { mensagemDeErroBff } from '@/shared/bff';
import { useSimplerDiet } from '../hooks/useWeeklyCheckIn';

/**
 * A5c · O cardápio mais simples, para aprovar: a mesma meta em uma refeição a
 * menos, com receitas rápidas. Monta ao abrir, uma vez; só "Aprovar cardápio"
 * grava (ADR-0020), e até lá a dieta de hoje segue valendo.
 *
 * @example router.push({ pathname: ROUTES.CHECKIN.SIMPLER, params: { checkInId } })
 */
export function SimplerDietScreen() {
  const router = useRouter();
  const { checkInId } = useLocalSearchParams<{ checkInId: string }>();
  const { build, approve } = useSimplerDiet();
  const asked = useRef(false);

  // Uma vez por abertura: o efeito roda de novo em modo estrito, e cada pedido
  // é uma geração de IA paga.
  useEffect(() => {
    if (asked.current || !checkInId) return;
    asked.current = true;
    build.mutate(checkInId, { onError: () => registrarFalha('checkin.build_simpler') });
  }, [build, checkInId]);

  async function approveDiet() {
    try {
      await approve.mutateAsync();
      router.replace(ROUTES.TABS.ROOT);
      showAlert({
        title: 'Cardápio aprovado',
        message: 'Seu plano mais simples começa hoje, com a mesma meta.',
        type: 'success',
      });
    } catch (error) {
      registrarFalha('checkin.approve_simpler');
      showAlert({ title: 'Não aprovado', message: mensagemDeErroBff(error), type: 'error' });
    }
  }

  if (!build.data) {
    return <BuildingState failed={build.isError} error={build.error} onRetry={retry} />;
  }
  return (
    <FlowFrame
      header={{}}
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{
            rotulo: 'Voltar',
            icone: 'arrow-back',
            onPress: () => router.back(),
            desabilitada: approve.isPending,
          }}
          principal={{
            rotulo: 'Aprovar cardápio',
            icone: 'checkmark',
            onPress: () => void approveDiet(),
            desabilitada: approve.isPending,
          }}
        />
      }
    >
      <FlowTitle eyebrow="Plano mais simples" sub="A mesma meta, com receitas de até 15 minutos.">
        {`${build.data.mealsAfter} refeições por dia`}
      </FlowTitle>
      <Meals diet={build.data} />
    </FlowFrame>
  );

  function retry() {
    if (checkInId) build.mutate(checkInId);
  }
}

function BuildingState({
  failed,
  error,
  onRetry,
}: {
  failed: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <FlowFrame
      header={failed ? {} : undefined}
      primary={failed ? { label: 'Tentar de novo', icon: 'refresh', onPress: onRetry } : undefined}
    >
      <FlowTitle
        eyebrow="Leva uns segundos"
        sub={failed ? mensagemDeErroBff(error) : 'Na mesma meta de calorias de hoje.'}
      >
        Montando seu cardápio
      </FlowTitle>
    </FlowFrame>
  );
}

function Meals({ diet }: { diet: SimplerDietPending }) {
  const meals = diet.plan.proposal.meals ?? [];
  return (
    <>
      <TituloDeSecao estilo="rotulo">Um dia de exemplo</TituloDeSecao>
      {meals.map((meal, index) => (
        <LinhaDeVidro
          key={`${meal.name}-${meal.meal_time}`}
          icon="restaurant-outline"
          tom="marca"
          titulo={meal.name}
          sub={meal.items.map((item) => item.food_name).join(', ')}
          direita={
            <Text className="text-xs font-extrabold text-hero">
              {diet.plan.mealCalories[index] ?? 0}
              <Text className="font-semibold text-placeholder"> kcal</Text>
            </Text>
          }
        />
      ))}
      <InfoNote icon="time-outline" className="mt-3">
        O tempo de preparo é estimativa: o banco de alimentos não guarda receita.
      </InfoNote>
    </>
  );
}
