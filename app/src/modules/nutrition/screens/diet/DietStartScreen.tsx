import {
  createNutritionService,
  DIET_STRATEGIES,
  DIET_STRATEGY_TYPES,
  type DietStrategyType,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import type { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Chip } from '@/components/ui/Chip';
import { FormField } from '@/components/ui/FormField';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { StepBar } from '@/components/ui/StepBar';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietCopySource } from '../../components/diet/DietCopySource';
import { type DietStartingPoint, useDietWizardStore } from '../../store/dietWizardStore';
import DietStudentPickerScreen from './DietStudentPickerScreen';

type IconName = keyof typeof Ionicons.glyphMap;
const nutrition = createNutritionService(supabase);

export const DIET_WIZARD_STEPS = 4;

const STRATEGY_ICON: Record<DietStrategyType, IconName> = {
  standard: 'restaurant-outline',
  carb_cycling: 'sync-outline',
  ketogenic: 'flame-outline',
  intermittent_fasting: 'time-outline',
  manual: 'create-outline',
};

interface StartingPointOption {
  value: DietStartingPoint;
  title: string;
  sub: string;
  icon: IconName;
  /** O Praticante não tem assistente de especialista (LGPD, #337). */
  specialistOnly: boolean;
}

const STARTING_POINTS: StartingPointOption[] = [
  {
    value: 'assistant',
    title: 'Sugestão da IA',
    sub: 'Conversa com o assistente, baseada na anamnese',
    icon: 'sparkles-outline',
    specialistOnly: true,
  },
  {
    value: 'strategy',
    title: 'Do zero',
    sub: 'Escolher a estratégia e montar as refeições',
    icon: 'create-outline',
    specialistOnly: false,
  },
  {
    value: 'copy',
    title: 'Copiar de um plano',
    sub: 'Estrutura, metas e alimentos de um plano pronto',
    icon: 'copy-outline',
    specialistOnly: false,
  },
];

const PLAN_TYPE_HINT = {
  unique: 'Mesmo cardápio todos os dias',
  cyclic: 'Cardápio por dia da semana',
} as const;

/**
 * Passo 1 da criação de dieta (#337): de onde o plano parte, a estratégia e o
 * nome. É a "Estratégia da Dieta" do web, no desenho do kit — a tela que o
 * mock não desenha, no estilo das outras do bloco E.
 */
export default function DietStartScreen() {
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
  }>();
  const accountType = useAuthStore((s) => s.accountType);
  const userId = useAuthStore((s) => s.user?.id);
  const studentId = accountType === 'specialist' ? params.studentId : userId;
  if (!studentId) return <DietStudentPickerScreen />;
  return (
    <DietStrategyScreen key={studentId} studentId={studentId} studentName={params.studentName} />
  );
}

function DietStrategyScreen({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName?: string;
}) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const canCreate = useAuthStore((s) => s.abilities?.can('create', 'Diet') ?? false);
  const [sourcePlanId, setSourcePlanId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);
  const wizard = useDietWizardStore();
  const ownPlan = studentId === userId;

  // O formulário só pode ser retomado pela mesma identidade e para o mesmo aluno.
  useEffect(() => {
    setSourcePlanId(null);
    const current = useDietWizardStore.getState();
    if (
      userId &&
      studentId &&
      (current.actorId !== userId || current.studentId !== studentId || current.planId)
    ) {
      current.startFor({
        actorId: userId,
        studentId,
        studentName: studentName ?? 'Aluno',
        ownPlan,
      });
    }
  }, [studentId, userId, studentName, ownPlan]);

  const points = STARTING_POINTS.filter((point) => !(ownPlan && point.specialistOnly));

  async function next() {
    if (!canCreate || !userId || !studentId || copyingRef.current) return;
    if (wizard.startingPoint === 'assistant') {
      router.push({ pathname: ROUTES.NUTRITION.WIZARD_ASSISTANT, params: { studentId } });
      return;
    }
    if (!wizard.planName.trim()) {
      showAlert({ title: 'Falta o nome', message: 'Dê um nome ao plano.', type: 'info' });
      return;
    }
    if (wizard.startingPoint === 'copy') {
      await copyPlan();
      return;
    }
    router.push({ pathname: ROUTES.NUTRITION.WIZARD_GOALS, params: { studentId } });
  }

  async function copyPlan() {
    if (!sourcePlanId || !userId) {
      showAlert({
        title: 'Escolha a origem',
        message: 'Selecione o plano que deseja copiar.',
        type: 'info',
      });
      return;
    }
    copyingRef.current = true;
    const generation = useDietWizardStore.getState().generation;
    setCopying(true);
    try {
      const draft = await nutrition.cloneDietPlan(
        sourcePlanId,
        studentId,
        ownPlan ? null : userId,
        wizard.planName
      );
      if (useDietWizardStore.getState().generation !== generation) return;
      wizard.setCreatedPlan(draft.id);
      router.replace({ pathname: ROUTES.NUTRITION.WIZARD_PLAN, params: { planId: draft.id } });
    } catch {
      showAlert({
        title: 'Não foi possível copiar',
        message: 'Suas escolhas foram mantidas. Tente novamente.',
        type: 'error',
      });
    } finally {
      copyingRef.current = false;
      setCopying(false);
    }
  }

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('legs')}
      bottomSpace="fixedButton"
      overlay={
        canCreate ? (
          <BotaoFixoNoRodape
            rotulo={copying ? 'Copiando…' : 'Continuar'}
            icone="arrow-forward"
            onPress={next}
            disabled={copying}
          />
        ) : undefined
      }
    >
      <CabecalhoSobreFoto
        sobrelinha={ownPlan ? 'Nova dieta' : `${wizard.studentName ?? 'Aluno'} · nova dieta`}
        titulo="Nova dieta"
        onVoltar={router.back}
      />
      <StepBar current={1} total={DIET_WIZARD_STEPS} />
      {!canCreate && (
        <Text accessibilityRole="alert" className="my-4 text-sm text-muted-foreground">
          Sua conta não tem permissão para criar dietas.
        </Text>
      )}

      <TituloDeSecao estilo="rotulo">Ponto de partida</TituloDeSecao>
      {points.map((point) => (
        <GlassChoice
          key={point.value}
          icon={point.icon}
          title={point.title}
          sub={point.sub}
          active={wizard.startingPoint === point.value}
          onPress={() => wizard.setStartingPoint(point.value)}
        />
      ))}

      {wizard.startingPoint === 'strategy' && (
        <>
          <TituloDeSecao estilo="rotulo">Estratégia</TituloDeSecao>
          {DIET_STRATEGY_TYPES.map((strategy) => (
            <GlassChoice
              key={strategy}
              icon={STRATEGY_ICON[strategy]}
              title={DIET_STRATEGIES[strategy].label}
              sub={DIET_STRATEGIES[strategy].description}
              active={wizard.strategy === strategy}
              onPress={() => wizard.setStrategy(strategy)}
            />
          ))}
          <View className="mt-1 flex-row">
            <Chip icone="calendar-outline">{PLAN_TYPE_HINT[wizard.planType()]}</Chip>
          </View>
        </>
      )}

      {wizard.startingPoint === 'copy' && userId && canCreate && (
        <DietCopySource
          key={userId}
          userId={userId}
          ownPlan={ownPlan}
          selectedPlanId={sourcePlanId}
          onSelect={setSourcePlanId}
        />
      )}

      {wizard.startingPoint !== 'assistant' && (
        <Vidro classeExterna="mt-4" className="p-4 pb-1">
          <FormField
            label="Nome do plano"
            icon="document-text-outline"
            value={wizard.planName}
            onChangeText={wizard.setPlanName}
            placeholder="Ex.: Cutting fase 2"
            autoCapitalize="sentences"
          />
        </Vidro>
      )}
    </TelaDeVidroComFoto>
  );
}
