import type { DietMealsProposal, DietPlanProposal } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import {
  Baloes,
  CabecalhoDoAssistente,
  CampoDaConversa,
  Digitando,
} from '@/shared/chat/ChatPieces';
import {
  type ProposalState,
  useNutritionAssistantChat,
} from '../../hooks/useNutritionAssistantChat';
import { formatKcal } from '../../services/dietPlanSummary';
import { useDietWizardStore } from '../../store/dietWizardStore';

/**
 * "Sugestão da IA" na criação de dieta (#337): o chat de nutrição do web, na
 * casca do assistente de treino. O plano aprovado vira rascunho e o wizard
 * segue para as refeições; o aluno não vê nada até o envio.
 */
export default function DietAssistantScreen() {
  const params = useLocalSearchParams<{ studentId?: string; planId?: string }>();
  const wizard = useDietWizardStore();
  const allowed = useAuthStore(
    (s) =>
      s.accountType === 'specialist' &&
      !!s.abilities?.can('create', 'Diet') &&
      !!s.abilities?.can('update', 'Diet')
  );
  const studentId = params.studentId ?? wizard.studentId;
  if (!allowed || !studentId) {
    return (
      <GlassScreen>
        <Text className="mt-4 text-foreground">
          Assistente indisponível para esta conta ou aluno.
        </Text>
      </GlassScreen>
    );
  }
  return (
    <DietAssistantConversation
      key={`${studentId}:${params.planId ?? 'new'}`}
      studentId={studentId}
      planId={params.planId}
    />
  );
}

function DietAssistantConversation({ studentId, planId }: { studentId: string; planId?: string }) {
  const router = useRouter();
  const wizard = useDietWizardStore();
  const token = useAuthStore((s) => s.session?.access_token ?? '');
  const chat = useNutritionAssistantChat({
    token,
    studentId,
    planId,
    sessionId: !planId && wizard.studentId === studentId ? wizard.aiSessionId : null,
    onSessionResolved: (id) => {
      if (!planId && useDietWizardStore.getState().studentId === studentId)
        wizard.setAiSessionId(id);
    },
    onPlanApproved: (id) => {
      if (!planId && useDietWizardStore.getState().studentId === studentId)
        wizard.setCreatedPlan(id);
    },
  });
  const blocked = chat.initializing || chat.responding || chat.saving || !!chat.error;

  const openPlan = () =>
    chat.planId &&
    router.replace({ pathname: ROUTES.NUTRITION.WIZARD_PLAN, params: { planId: chat.planId } });

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassScreen
        bottomSpace="actionBar"
        overlay={<CampoDaConversa respondendo={blocked} onEnviar={chat.sendMessage} />}
      >
        <CabecalhoDoAssistente assunto="plano alimentar" onVoltar={router.back} />
        {chat.initializing && <Text className="mt-4 text-muted-foreground">Abrindo conversa…</Text>}
        {chat.error && (
          <Vidro className="mt-3 p-4">
            <Text accessibilityRole="alert" className="text-foreground">
              {chat.error}
            </Text>
            <Row icon="refresh-outline" title="Tentar novamente" onPress={chat.retry} />
          </Vidro>
        )}
        <Baloes mensagens={chat.messages} />

        {chat.planProposal && (
          <PlanProposalCard
            proposal={chat.planProposal}
            saving={blocked}
            onApprove={chat.approvePlan}
            onAdjust={() => chat.sendMessage('Quero ajustar o plano proposto.')}
          />
        )}
        {chat.mealsProposal && (
          <MealsProposalCard
            proposal={chat.mealsProposal}
            saving={blocked || !chat.planId}
            onApprove={chat.approveMeals}
            onAdjust={() => chat.sendMessage('Quero ajustar as refeições propostas.')}
            onOpenPlan={openPlan}
          />
        )}
        {chat.planId && !chat.mealsProposal?.saved && (
          <Row
            icon="restaurant-outline"
            title="Continuar montagem manual"
            onPress={blocked && !chat.error ? undefined : openPlan}
          />
        )}
        {chat.responding && <Digitando />}
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}

interface CardProps<T> {
  proposal: ProposalState<T>;
  saving: boolean;
  onApprove: () => void;
  onAdjust: () => void;
}

function Decision({ saving, onApprove, onAdjust }: Omit<CardProps<unknown>, 'proposal'>) {
  return (
    <View className="mt-3 flex-row gap-2">
      <Row
        icon="checkmark-circle-outline"
        title={saving ? 'Salvando…' : 'Aprovar'}
        onPress={saving ? undefined : onApprove}
      />
      <Row icon="create-outline" title="Ajustar" onPress={saving ? undefined : onAdjust} />
    </View>
  );
}

function PlanProposalCard({ proposal, ...decision }: CardProps<DietPlanProposal>) {
  const plan = proposal.data;
  return (
    <Vidro destaque={proposal.saved} className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">{plan.name}</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        {`${formatKcal(plan.target_calories)} kcal · P${plan.target_protein} C${plan.target_carbs} G${plan.target_fat} · ${plan.duration_weeks} semanas`}
      </Text>
      {plan.notes ? (
        <Text className="mt-2 text-[0.78125rem] text-foreground">
          {`O aluno lê esta observação: ${plan.notes}`}
        </Text>
      ) : null}
      {!proposal.saved && <Decision {...decision} />}
    </Vidro>
  );
}

function MealsProposalCard({
  proposal,
  onOpenPlan,
  ...decision
}: CardProps<DietMealsProposal> & { onOpenPlan: () => void }) {
  return (
    <Vidro destaque={proposal.saved} className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">Adicionar refeições</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        As refeições existentes serão mantidas. Confira os alimentos antes de aprovar.
      </Text>
      {proposal.data.meals.map((meal) => (
        <View key={`${meal.name}-${meal.day_of_week ?? 'u'}-${meal.meal_time ?? ''}`}>
          <Text className="mt-2 text-[0.8125rem] text-foreground">
            {`${meal.day_of_week == null ? '' : `${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][meal.day_of_week]} · `}${meal.meal_time ?? '--'} · ${meal.name}`}
          </Text>
          {meal.items.map((item) => (
            <Text
              key={`${item.food_name}-${item.quantity}-${item.unit}`}
              className="mt-1 text-[0.8125rem] text-muted-foreground"
            >{`${item.food_name} · ${item.quantity} ${item.unit}`}</Text>
          ))}
        </View>
      ))}
      {proposal.saved ? (
        <View className="mt-3">
          <BotaoDeDestaque
            rotulo="Revisar as refeições"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onOpenPlan}
          />
        </View>
      ) : (
        <Decision {...decision} />
      )}
    </Vidro>
  );
}
