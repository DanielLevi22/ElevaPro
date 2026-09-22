import type { BulkWorkoutProposal } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { WorkoutChatService } from '../services/WorkoutChatService';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const LETRAS = 'ABCDEFGH';

function resumoDoExercicio(item: {
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
}): string {
  const partes = [
    item.sets ? `${item.sets} séries` : null,
    item.reps ? `${item.reps} reps` : null,
    item.rest_seconds ? `${item.rest_seconds}s descanso` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Sem configuração';
}

/**
 * Passo 2 do wizard: monta os treinos (Treino A/B/C…) da fase criada no
 * passo 1, cada um com sua lista de exercícios — reaproveita a Biblioteca de
 * exercícios já existente (`SelectExercisesScreen`) para adicionar itens, e a
 * "Sugestão da IA" chama o mesmo `propose_workouts`/`save-workouts` do web.
 */
export default function WorkoutWizardBuildScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const wizard = useWorkoutWizardStore();
  const { workouts, fetchWorkoutsForPhase, createWorkout, isLoading } = useWorkoutStore();
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const specialistId = useAuthStore((s) => s.user?.id ?? null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [workoutProposal, setWorkoutProposal] = useState<BulkWorkoutProposal | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só a fase muda o que buscar; a função vem da store e é estável entre renders
  useEffect(() => {
    if (wizard.phaseId) fetchWorkoutsForPhase(wizard.phaseId);
  }, [wizard.phaseId]);

  useEffect(() => {
    if (!activeId && workouts.length > 0) setActiveId(workouts[0].id);
  }, [workouts, activeId]);

  const activeWorkout = workouts.find((w) => w.id === activeId) ?? null;

  async function addWorkout() {
    if (!wizard.phaseId || !specialistId) return;
    const letra = LETRAS[workouts.length] ?? String(workouts.length + 1);
    try {
      await createWorkout({
        training_plan_id: wizard.phaseId,
        title: `Treino ${letra}`,
        specialist_id: specialistId,
      });
    } catch {
      showAlert({ title: 'Erro', message: 'Não foi possível criar o treino.', type: 'error' });
    }
  }

  async function requestAiWorkouts() {
    if (!token || !studentId) return;
    setAiLoading(true);
    try {
      const sessionId =
        wizard.aiSessionId ?? (await WorkoutChatService.loadSession(token, studentId)).sessionId;
      wizard.setAiSessionId(sessionId);

      const mensagem = `Sugira os treinos da fase "${wizard.planName}"${
        wizard.split ? `, divisão ${wizard.split}` : ''
      }${wizard.objective ? `, foco em ${wizard.objective}` : ''}.`;

      let proposta: BulkWorkoutProposal | null = null;
      let erro: string | null = null;
      await WorkoutChatService.sendMessage(token, studentId, mensagem, sessionId, (event) => {
        if (event.type === 'workout_proposal') proposta = event.data;
        if (event.type === 'error') erro = event.message;
      });

      if (erro || !proposta) throw new Error(erro ?? 'sem proposta');
      setWorkoutProposal(proposta);
    } catch {
      showAlert({
        title: 'IA indisponível',
        message: 'Não consegui gerar treinos agora. Tente de novo ou monte manualmente.',
        type: 'error',
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function approveAiWorkouts() {
    if (!token || !studentId || !wizard.aiSessionId) return;
    setApproving(true);
    try {
      await WorkoutChatService.approveWorkouts(token, studentId, wizard.aiSessionId);
      setWorkoutProposal(null);
      if (wizard.phaseId) await fetchWorkoutsForPhase(wizard.phaseId);
    } catch {
      showAlert({ title: 'Erro', message: 'Não consegui salvar os treinos da IA.', type: 'error' });
    } finally {
      setApproving(false);
    }
  }

  function goToLibrary() {
    if (!activeWorkout) return;
    router.push({
      pathname: ROUTES.WORKOUTS.SELECT_EXERCISES,
      params: { workoutId: activeWorkout.id, studentId },
    });
  }

  function handleContinue() {
    if (workouts.length === 0) {
      showAlert({
        title: 'Adicione um treino',
        message: 'Crie ao menos um treino antes de continuar.',
        type: 'error',
      });
      return;
    }
    router.push({ pathname: ROUTES.WORKOUTS.WIZARD_REVIEW, params: { studentId } });
  }

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BotaoFixoNoRodape rotulo="Continuar" icone="arrow-forward" onPress={handleContinue} />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <ProgressHeader
        size="page"
        eyebrow={wizard.planName || 'Novo plano'}
        title="Montagem do treino"
      />

      <View className="mt-3">
        <Text className="mb-1.5 text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
          2 de 3
        </Text>
        <BarraDeProgresso percentual={66} espessura="fina" />
      </View>

      {workouts.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-1.5">
          {workouts.map((w) => (
            <Chip key={w.id} tom={w.id === activeId ? 'destaque' : 'neutro'}>
              {w.title}
            </Chip>
          ))}
        </View>
      ) : null}
      <Row icon="add-circle-outline" title="Adicionar treino" onPress={addWorkout} />
      <Row
        icon="sparkles"
        title={aiLoading ? 'Gerando…' : 'Sugestão da IA'}
        sub="Propõe os treinos da fase pra você aprovar"
        onPress={aiLoading ? undefined : requestAiWorkouts}
      />

      {workoutProposal ? (
        <PropostaDeTreinos
          proposta={workoutProposal}
          aprovando={approving}
          onAprovar={approveAiWorkouts}
          onDescartar={() => setWorkoutProposal(null)}
        />
      ) : null}

      {activeWorkout ? (
        <>
          <TituloDeSecao acao={`${activeWorkout.exercises?.length ?? 0} exercícios`}>
            {activeWorkout.title}
          </TituloDeSecao>
          {(activeWorkout.exercises ?? []).map((item) => (
            <Card key={item.id} className="mb-2">
              <Text className="text-[0.875rem] font-bold text-foreground">
                {item.exercise?.name ?? 'Exercício'}
              </Text>
              <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
                {resumoDoExercicio(item)}
              </Text>
            </Card>
          ))}
          <Row icon="barbell-outline" title="Adicionar exercício" chevron onPress={goToLibrary} />
        </>
      ) : (
        <Text className="mt-4 text-[0.8125rem] text-muted-foreground">
          {isLoading ? 'Carregando…' : 'Crie um treino para começar a adicionar exercícios.'}
        </Text>
      )}
    </GlassScreen>
  );
}

function PropostaDeTreinos({
  proposta,
  aprovando,
  onAprovar,
  onDescartar,
}: {
  proposta: BulkWorkoutProposal;
  aprovando: boolean;
  onAprovar: () => void;
  onDescartar: () => void;
}) {
  return (
    <Card className="mt-1">
      <Text className="text-[0.95rem] font-bold text-foreground">{proposta.phase_name}</Text>
      {proposta.workouts.map((w) => (
        <Text key={w.title} className="mt-2 text-[0.8125rem] text-foreground">
          {w.title} · {w.exercises?.length ?? 0} exercícios
        </Text>
      ))}
      <View className="mt-3 flex-row gap-2">
        <Row
          icon="checkmark-circle-outline"
          title={aprovando ? 'Salvando…' : 'Aprovar e adicionar'}
          onPress={aprovando ? undefined : onAprovar}
        />
        <Row icon="close-circle-outline" title="Descartar" onPress={onDescartar} />
      </View>
    </Card>
  );
}
