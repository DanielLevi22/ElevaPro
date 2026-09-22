import type { WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
import { useCores, useEscala } from '@/shared/design';
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
  const { workouts, fetchWorkoutsForPhase, createWorkout, reorderWorkoutExercises, isLoading } =
    useWorkoutStore();
  const specialistId = useAuthStore((s) => s.user?.id ?? null);

  const [activeId, setActiveId] = useState<string | null>(null);

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

  function goToAssistant() {
    router.push({ pathname: ROUTES.WORKOUTS.WIZARD_ASSISTANT, params: { studentId } });
  }

  function goToLibrary() {
    if (!activeWorkout) return;
    router.push({
      pathname: ROUTES.WORKOUTS.SELECT_EXERCISES,
      params: { workoutId: activeWorkout.id, studentId },
    });
  }

  async function moveExercise(indice: number, direcao: -1 | 1) {
    const exercicios = activeWorkout?.exercises ?? [];
    const alvo = indice + direcao;
    if (!activeWorkout || alvo < 0 || alvo >= exercicios.length) return;

    const reordenados = [...exercicios];
    [reordenados[indice], reordenados[alvo]] = [reordenados[alvo], reordenados[indice]];
    await reorderWorkoutExercises(
      activeWorkout.id,
      reordenados.map((exercicio, i) => ({ id: exercicio.id, order_index: i }))
    );
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
        title="Sugestão da IA"
        sub="Conversa com o assistente para propor os treinos da fase"
        chevron
        onPress={goToAssistant}
      />

      {activeWorkout ? (
        <>
          <TituloDeSecao acao={`${activeWorkout.exercises?.length ?? 0} exercícios`}>
            {activeWorkout.title}
          </TituloDeSecao>
          {(activeWorkout.exercises ?? []).map((item, index, todos) => (
            <ExercicioDoTreinoCard
              key={item.id}
              item={item}
              podeSubir={index > 0}
              podeDescer={index < todos.length - 1}
              onSubir={() => moveExercise(index, -1)}
              onDescer={() => moveExercise(index, 1)}
            />
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

const TAMANHO_DA_SETA = 15;

function ExercicioDoTreinoCard({
  item,
  podeSubir,
  podeDescer,
  onSubir,
  onDescer,
}: {
  item: WorkoutExercise;
  podeSubir: boolean;
  podeDescer: boolean;
  onSubir: () => void;
  onDescer: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Card className="mb-2 flex-row items-center justify-between">
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-[0.875rem] font-bold text-foreground">
          {item.exercise?.name ?? 'Exercício'}
        </Text>
        <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
          {resumoDoExercicio(item)}
        </Text>
      </View>
      <View className="gap-1.5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mover exercício para cima"
          disabled={!podeSubir}
          onPress={onSubir}
          className="h-7 w-7 items-center justify-center rounded-sm bg-muted"
        >
          <Ionicons
            name="chevron-up"
            size={escalar(TAMANHO_DA_SETA)}
            color={podeSubir ? cores.foreground : cores.placeholder}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mover exercício para baixo"
          disabled={!podeDescer}
          onPress={onDescer}
          className="h-7 w-7 items-center justify-center rounded-sm bg-muted"
        >
          <Ionicons
            name="chevron-down"
            size={escalar(TAMANHO_DA_SETA)}
            color={podeDescer ? cores.foreground : cores.placeholder}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
}
