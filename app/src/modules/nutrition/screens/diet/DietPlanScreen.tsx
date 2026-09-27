import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { StepBar } from '@/components/ui/StepBar';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DashedAddButton } from '../../components/diet/DashedAddButton';
import { DietListFeedback } from '../../components/diet/DietListFeedback';
import { MealBuilderCard } from '../../components/diet/MealBuilderCard';
import { ToggleChip } from '../../components/diet/ToggleChip';
import { WeekdayStrip } from '../../components/diet/WeekdayStrip';
import { type DietPlanEditor, useDietPlanEditor } from '../../hooks/useDietPlanEditor';
import { numeroDoBanco } from '../../services/consumoDoDia';
import { dayCalories, formatKcal } from '../../services/dietPlanSummary';
import { DIET_WIZARD_STEPS } from './DietStartScreen';

/**
 * Passo 3 da criação de dieta (#337), a tela 18 do kit: quanto da meta já está
 * montado e as refeições, com o dia da semana na dieta cíclica. É também a tela
 * do plano para quem volta a um rascunho. Cada mudança grava na hora — e o
 * aluno não vê nada, porque o plano ainda é rascunho.
 */
export default function DietPlanScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const editor = useDietPlanEditor(planId);
  const target = numeroDoBanco(editor.plan?.target_calories);
  const assembled = dayCalories(editor.mealsOfTheDay);
  const cyclic = editor.plan?.plan_type === 'cyclic';

  const openMeal = (mealId?: string) =>
    router.push({
      pathname: ROUTES.NUTRITION.WIZARD_MEAL,
      params: { planId, day: String(editor.day), ...(mealId ? { mealId } : {}) },
    });

  if (editor.plan && !editor.canEdit) return <Redirect href={ROUTES.NUTRITION.PLAN(planId)} />;
  if (!editor.plan)
    return (
      <TelaDeVidroComFoto image={fotoDoGrupo('legs')}>
        <CabecalhoSobreFoto
          sobrelinha="Plano alimentar"
          titulo="Refeições"
          onVoltar={router.back}
        />
        <DietListFeedback
          loaded={!editor.loading}
          error={editor.error}
          paused={false}
          onRetry={() => void editor.reload()}
          noun="planos"
        />
      </TelaDeVidroComFoto>
    );

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('chest')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo="Revisar dieta"
          icone="arrow-forward"
          onPress={() =>
            router.push({ pathname: ROUTES.NUTRITION.WIZARD_REVIEW, params: { planId } })
          }
        />
      }
    >
      <CabecalhoSobreFoto
        sobrelinha={`Dieta ${formatKcal(target)} kcal`}
        titulo="Refeições"
        onVoltar={router.back}
        direita={
          editor.plan.specialist_id ? (
            <BotaoRedondo
              icone="sparkles"
              rotulo="Assistente de nutrição"
              onPress={() =>
                router.push({
                  pathname: ROUTES.NUTRITION.WIZARD_ASSISTANT,
                  params: { planId, studentId: editor.plan?.student_id },
                })
              }
            />
          ) : undefined
        }
      />
      <StepBar
        current={editor.plan.source_plan_id ? 1 : 3}
        total={editor.plan.source_plan_id ? 2 : DIET_WIZARD_STEPS}
      />
      {editor.plan.source_plan_id && (
        <Text className="mt-2 text-[0.6875rem] text-muted-foreground">
          Ajuste em rascunho · versão {editor.plan.version}
        </Text>
      )}

      <Vidro classeExterna="mt-4" className="p-[0.8125rem]">
        <View className="mb-2 flex-row justify-between">
          <Text className="text-[0.75rem] font-bold text-foreground">
            {`${formatKcal(assembled)} de ${formatKcal(target)} kcal montadas`}
          </Text>
          <Text className="text-[0.75rem] text-muted-foreground">
            {`${target > 0 ? Math.round((assembled / target) * 100) : 0}%`}
          </Text>
        </View>
        <BarraDeProgresso percentual={target > 0 ? (assembled / target) * 100 : 0} />
      </Vidro>

      {cyclic && <CyclicDayControls editor={editor} />}

      {editor.mealsOfTheDay.map((meal) => (
        <MealBuilderCard key={meal.id} meal={meal} onEdit={() => openMeal(meal.id)} />
      ))}

      <DashedAddButton label="Adicionar refeição" onPress={() => openMeal()} className="mt-2.5" />
    </TelaDeVidroComFoto>
  );
}

function CyclicDayControls({ editor }: { editor: DietPlanEditor }) {
  const confirmClear = () =>
    showConfirm({
      title: 'Limpar o dia?',
      message: 'As refeições deste dia e os alimentos delas saem do plano.',
      type: 'danger',
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
      onConfirm: editor.clearDay,
    });

  return (
    <>
      <WeekdayStrip value={editor.day} onChange={editor.setDay} />
      <View className="mt-2.5 flex-row flex-wrap gap-2">
        <ToggleChip active={false} onPress={editor.copyDay}>
          Copiar dia
        </ToggleChip>
        {editor.hasCopiedDay && (
          <ToggleChip active={false} onPress={editor.pasteDay}>
            Colar aqui
          </ToggleChip>
        )}
        <ToggleChip active={false} onPress={confirmClear}>
          Limpar dia
        </ToggleChip>
      </View>
    </>
  );
}
