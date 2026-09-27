import { calculateDietStrategy, createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { StepBar } from '@/components/ui/StepBar';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { DailyGoalCard } from '../../components/diet/DailyGoalCard';
import { DietPreferencesPanel } from '../../components/diet/DietPreferencesPanel';
import { MacroSplitRow } from '../../components/diet/MacroSplitRow';
import { StepButton } from '../../components/diet/StepButton';
import { WeeklyForecast } from '../../components/diet/WeeklyForecast';
import { useDietGoalSetup } from '../../hooks/useDietGoalSetup';
import { draftInput } from '../../services/dietDraft';
import { useDietWizardStore } from '../../store/dietWizardStore';
import { DIET_WIZARD_STEPS } from './DietStartScreen';

const nutrition = createNutritionService(supabase);

/**
 * Passo 2 da criação de dieta (#337), a tela 17 do kit: meta diária pela
 * anamnese, distribuição de macros, preferências, e — do web — a vigência e a
 * previsão da semana. Sair daqui cria o plano em rascunho, que o aluno não vê.
 */
export default function DietGoalsScreen() {
  const router = useRouter();
  const wizard = useDietWizardStore();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setup = useDietGoalSetup(wizard.studentId ?? '');
  const [saving, setSaving] = useState(false);
  const grams = wizard.macroGrams();

  async function createDraft() {
    if (!wizard.studentId || !userId || saving) return;
    setSaving(true);
    try {
      const input = draftInput(
        { ...wizard, studentId: wizard.studentId, macroGrams: grams },
        userId,
        getLocalDateISOString()
      );
      const draft = await nutrition.createDietPlanFromStrategy(input, wizard.strategy);
      wizard.setCreatedPlan(draft.id);
      router.replace({ pathname: ROUTES.NUTRITION.WIZARD_PLAN, params: { planId: draft.id } });
    } catch {
      showAlert({ title: 'Erro', message: 'Não foi possível criar o plano.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('legs')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo={saving ? 'Criando' : 'Montar refeições'}
          icone="arrow-forward"
          onPress={createDraft}
          disabled={saving || setup.loading}
        />
      }
    >
      <CabecalhoSobreFoto
        sobrelinha={wizard.ownPlan ? 'Nova dieta' : `${wizard.studentName ?? 'Aluno'} · nova dieta`}
        titulo="Metas e macros"
        onVoltar={router.back}
      />
      <StepBar current={2} total={DIET_WIZARD_STEPS} />

      <DailyGoalCard
        targetCalories={wizard.targetCalories}
        suggestion={setup.suggestion}
        onChange={wizard.setTargetCalories}
      />

      <TituloDeSecao estilo="rotulo">Distribuição de macros</TituloDeSecao>
      <MacroSplitRow
        macro="protein"
        grams={grams.protein}
        percent={wizard.macroPercent.protein}
        onStep={(delta) => wizard.setMacroPercent('protein', wizard.macroPercent.protein + delta)}
      />
      <MacroSplitRow macro="carbs" grams={grams.carbs} percent={wizard.macroPercent.carbs} />
      <MacroSplitRow
        macro="fat"
        grams={grams.fat}
        percent={wizard.macroPercent.fat}
        onStep={(delta) => wizard.setMacroPercent('fat', wizard.macroPercent.fat + delta)}
      />

      <TituloDeSecao estilo="rotulo">Preferências</TituloDeSecao>
      <DietPreferencesPanel
        value={wizard.preferences}
        onChange={wizard.setPreferences}
        hasOtherNotes={setup.hasOtherNotes}
      />

      <TituloDeSecao estilo="rotulo">Vigência</TituloDeSecao>
      <Vidro className="flex-row items-center justify-between p-3.5">
        <Text className="text-[0.8125rem] font-semibold text-foreground">
          {`A partir de hoje, por ${wizard.durationWeeks} ${wizard.durationWeeks === 1 ? 'semana' : 'semanas'}`}
        </Text>
        <View className="flex-row gap-2">
          <StepButton
            direction="down"
            label="Menos uma semana"
            onPress={() => wizard.setDurationWeeks(wizard.durationWeeks - 1)}
          />
          <StepButton
            direction="up"
            label="Mais uma semana"
            onPress={() => wizard.setDurationWeeks(wizard.durationWeeks + 1)}
          />
        </View>
      </Vidro>

      {wizard.planType() === 'cyclic' && (
        <>
          <TituloDeSecao estilo="rotulo">Previsão semanal</TituloDeSecao>
          <WeeklyForecast
            schedule={calculateDietStrategy(wizard.strategy, wizard.targetCalories)}
          />
        </>
      )}
    </TelaDeVidroComFoto>
  );
}
