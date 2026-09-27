import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { StepBar } from '@/components/ui/StepBar';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietListFeedback } from '../../components/diet/DietListFeedback';
import { DietSummaryCard } from '../../components/diet/DietSummaryCard';
import { WeekdayStrip } from '../../components/diet/WeekdayStrip';
import { useDietPlanEditor } from '../../hooks/useDietPlanEditor';
import { MACROS_ZERADOS, type Macros, numeroDoBanco } from '../../services/consumoDoDia';
import { formatKcal, mealCalories, planSummaryLine } from '../../services/dietPlanSummary';
import { dayTotals, reviewNotes } from '../../services/dietReview';
import { DIET_WIZARD_STEPS } from './DietStartScreen';

const NOTE_ICON = 17;

function averageOf(totals: { macros: Macros }[]): Macros {
  if (totals.length === 0) return MACROS_ZERADOS;
  const mean = (pick: (m: Macros) => number) =>
    totals.reduce((sum, t) => sum + pick(t.macros), 0) / totals.length;
  return {
    calorias: mean((m) => m.calorias),
    proteina: mean((m) => m.proteina),
    carboidrato: mean((m) => m.carboidrato),
    gordura: mean((m) => m.gordura),
  };
}

/**
 * Passo 4 da criação de dieta (#337), a tela 19 do kit: o plano montado, o
 * aviso de onde ele se afasta da meta, o resumo por refeição e a mensagem para
 * a aluna. Enviar faz o rascunho valer e finaliza a dieta anterior.
 */
export default function DietReviewScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const editor = useDietPlanEditor(planId);
  const pending = useRef(false);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const plan = editor.plan;
  const ownPlan = plan?.specialist_id === null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a mensagem salva entra uma vez, quando o plano chega
  useEffect(() => {
    if (plan?.notes) setNotes(plan.notes);
  }, [plan?.id]);

  const totals = plan ? dayTotals(editor.meals, plan.plan_type) : [];
  const average = averageOf(totals.filter((t) => t.macros.calorias > 0));
  const notesForReview = reviewNotes(totals, {
    calorias: numeroDoBanco(plan?.target_calories),
    proteina: numeroDoBanco(plan?.target_protein),
  });
  const alreadyActive = plan?.status !== 'draft';
  const ready = totals.length > 0 && totals.every((t) => t.macros.calorias > 0);

  async function send() {
    if (pending.current || !editor.canEdit) return;
    pending.current = true;
    setSending(true);
    const ok = await editor.send(notes.trim() || null);
    setSending(false);
    pending.current = false;
    if (ok) router.replace({ pathname: ROUTES.NUTRITION.WIZARD_SENT, params: { planId } });
  }

  const cta = alreadyActive ? 'Concluir' : ownPlan ? 'Ativar plano' : 'Enviar para a aluna';
  if (plan && !editor.canEdit) return <Redirect href={ROUTES.NUTRITION.PLAN(planId)} />;
  if (!plan)
    return (
      <TelaDeVidroComFoto image={fotoDoGrupo('back')}>
        <CabecalhoSobreFoto
          sobrelinha="Plano alimentar"
          titulo="Revisar dieta"
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
      image={fotoDoGrupo('back')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo={sending ? 'Enviando' : cta}
          icone={alreadyActive ? 'checkmark' : 'send'}
          onPress={send}
          disabled={sending || !editor.canEdit}
        />
      }
    >
      <CabecalhoSobreFoto
        sobrelinha={ownPlan ? 'Minha dieta' : 'Plano alimentar'}
        titulo="Revisar e enviar"
        onVoltar={router.back}
      />
      <StepBar
        current={plan?.source_plan_id ? 2 : DIET_WIZARD_STEPS}
        total={plan?.source_plan_id ? 2 : DIET_WIZARD_STEPS}
      />
      {plan?.source_plan_id && (
        <Text className="mt-2 text-[0.6875rem] text-muted-foreground">
          Revisão do ajuste · versão {plan.version}
        </Text>
      )}

      <DietSummaryCard
        name={plan?.name ?? 'Plano alimentar'}
        status={ready ? 'Pronto' : 'Incompleto'}
        highlighted={ready}
        subtitle={planSummaryLine(
          editor.mealsOfTheDay.length,
          average.calorias,
          plan?.dietary_restrictions ?? []
        )}
        protein={average.proteina}
        carbs={average.carboidrato}
        fat={average.gordura}
      />
      <ReviewNote lines={notesForReview} />

      <TituloDeSecao estilo="rotulo">Resumo por refeição</TituloDeSecao>
      {plan?.plan_type === 'cyclic' && <WeekdayStrip value={editor.day} onChange={editor.setDay} />}
      {editor.mealsOfTheDay.map((meal) => (
        <Vidro key={meal.id} classeExterna="mt-2" className="flex-row items-center p-3">
          <Text className="w-11 text-[0.71875rem] font-bold text-placeholder">
            {meal.meal_time?.slice(0, 5) ?? '--'}
          </Text>
          <Text className="flex-1 text-[0.8125rem] font-bold text-foreground">{meal.name}</Text>
          <Text className="text-[0.78125rem] font-bold text-primary-text">
            {`${formatKcal(mealCalories(meal))} kcal`}
          </Text>
        </Vidro>
      ))}

      {!ownPlan && (
        <>
          <TituloDeSecao estilo="rotulo">Mensagem para a aluna</TituloDeSecao>
          <Vidro className="p-3.5">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="O que ela precisa saber sobre esta dieta"
              accessibilityLabel="Mensagem para a aluna"
              className="min-h-[4.5rem] text-[0.78125rem] leading-[1.45] text-foreground"
            />
          </Vidro>
        </>
      )}
    </TelaDeVidroComFoto>
  );
}

function ReviewNote({ lines }: { lines: string[] }) {
  const colors = useCores();
  const scale = useEscala();
  return (
    <Vidro
      classeExterna="mt-3"
      className="flex-row items-start gap-3 border-secondary/40 p-[0.8125rem]"
    >
      <Ionicons name="sparkles-outline" size={scale(NOTE_ICON)} color={colors.secondary} />
      <Text className="flex-1 text-[0.75rem] leading-[1.4] text-muted-foreground">
        {lines.join(' ')}
      </Text>
    </Vidro>
  );
}
