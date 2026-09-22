import { contagem, gruposDoTreino } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { EstadoDaTela } from '../components/aluno/EstadoDaTela';
import { ExercicioDoTreinoCard } from '../components/ExercicioDoTreinoCard';
import { ExerciseConfigModal } from '../components/ExerciseConfigModal';
import { type SelectedExercise, useWorkoutStore } from '../store/workoutStore';

type Workout = ReturnType<typeof useWorkoutStore.getState>['workouts'][0];
type StoreExerciseItem = NonNullable<Workout['exercises']>[number];

/**
 * A ficha do treino, na visão de quem gerencia — especialista editando o
 * treino do aluno, ou o praticante ajustando o próprio. A do aluno em
 * execução mora em `DetalheDoTreinoScreen`, que só lê.
 */
export default function WorkoutDetailsScreen() {
  const { id, workoutId, mode: modeParam } = useLocalSearchParams();
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const router = useRouter();
  const { accountType } = useAuthStore();
  const canManage =
    (accountType === 'specialist' || accountType === 'member') &&
    !(accountType === 'member' && mode === 'execute');
  const {
    workouts,
    fetchWorkoutById,
    updateWorkoutExercise,
    removeWorkoutItem,
    reorderWorkoutExercises,
  } = useWorkoutStore();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreExerciseItem | null>(null);

  const targetId = (workoutId || id) as string;

  useEffect(() => {
    const found = workouts.find((w) => w.id === targetId);
    if (found) {
      setWorkout(found);
      return;
    }
    if (!targetId) return;
    fetchWorkoutById(targetId).then((data) => {
      if (data) setWorkout(data);
      else setNaoEncontrado(true);
    });
  }, [workouts, targetId, fetchWorkoutById]);

  const handleSaveExercise = useCallback(
    async (dados: SelectedExercise) => {
      if (!workout || !editingItem?.exercise) return;
      try {
        const videoMudou = dados.video_url !== editingItem.exercise.video_url;
        await updateWorkoutExercise(
          workout.id,
          editingItem.id,
          {
            sets: dados.sets,
            reps: String(dados.reps),
            weight: dados.weight,
            rest_seconds: dados.rest_seconds,
          },
          videoMudou
            ? { exerciseId: editingItem.exercise.id, value: dados.video_url ?? null }
            : undefined
        );
        setEditingItem(null);
      } catch {
        showAlert({
          title: 'Erro',
          message: 'Não foi possível salvar as alterações.',
          type: 'error',
        });
      }
    },
    [workout, editingItem, updateWorkoutExercise]
  );

  const handleRemoveExercise = useCallback(
    (item: StoreExerciseItem) => {
      if (!workout) return;
      showConfirm({
        title: 'Remover exercício',
        message: `Remover "${item.exercise?.name ?? 'este exercício'}" do treino?`,
        type: 'danger',
        confirmText: 'Remover',
        onConfirm: async () => {
          try {
            await removeWorkoutItem(workout.id, item.id);
          } catch {
            showAlert({
              title: 'Erro',
              message: 'Não foi possível remover o exercício.',
              type: 'error',
            });
          }
        },
      });
    },
    [workout, removeWorkoutItem]
  );

  const moveExercise = useCallback(
    async (indice: number, direcao: -1 | 1) => {
      const exercicios = workout?.exercises ?? [];
      const alvo = indice + direcao;
      if (!workout || alvo < 0 || alvo >= exercicios.length) return;
      const reordenados = [...exercicios];
      [reordenados[indice], reordenados[alvo]] = [reordenados[alvo], reordenados[indice]];
      await reorderWorkoutExercises(
        workout.id,
        reordenados.map((exercicio, i) => ({ id: exercicio.id, order_index: i }))
      );
    },
    [workout, reorderWorkoutExercises]
  );

  function goToLibrary() {
    if (!workout) return;
    router.push({
      pathname: ROUTES.WORKOUTS.SELECT_EXERCISES,
      params: { workoutId: workout.id, studentId: id },
    });
  }

  if (!workout)
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Treino não encontrado." />;

  const exercicios = workout.exercises ?? [];

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo(workout.muscle_group)}
      bottomSpace={canManage ? 'tab' : 'fixedButton'}
      overlay={
        !canManage && exercicios.length > 0 ? (
          <BotaoFixoNoRodape
            rotulo="Iniciar treino"
            icone="play"
            onPress={() => router.push(ROUTES.WORKOUTS.EXECUTE(workout.id))}
          />
        ) : null
      }
    >
      <CabecalhoDoTreino
        workout={workout}
        canManage={canManage}
        onVoltar={router.back}
        onAdicionar={goToLibrary}
      />

      <TituloDeSecao
        estilo="rotulo"
        acao={contagem(exercicios.length, 'movimento planejado', 'movimentos planejados')}
      >
        Lista de exercícios
      </TituloDeSecao>

      {exercicios.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-center text-[0.8125rem] text-muted-foreground">
            Nenhum exercício cadastrado ainda.
          </Text>
        </View>
      ) : (
        exercicios.map((item, index, todos) => (
          <ExercicioDoTreinoCard
            key={item.id}
            item={item}
            podeSubir={canManage && index > 0}
            podeDescer={canManage && index < todos.length - 1}
            onSubir={() => moveExercise(index, -1)}
            onDescer={() => moveExercise(index, 1)}
            onEditar={canManage ? () => setEditingItem(item) : undefined}
            onRemover={canManage ? () => handleRemoveExercise(item) : undefined}
          />
        ))
      )}

      {canManage ? (
        <Row icon="barbell-outline" title="Adicionar exercício" chevron onPress={goToLibrary} />
      ) : null}

      {editingItem?.exercise ? (
        <ExerciseConfigModal
          visible
          onClose={() => setEditingItem(null)}
          exercise={{
            id: editingItem.exercise.id,
            name: editingItem.exercise.name,
            muscle_group: editingItem.exercise.muscle_group,
          }}
          initialData={{
            id: editingItem.exercise.id,
            name: editingItem.exercise.name,
            muscle_group: editingItem.exercise.muscle_group ?? '',
            sets: editingItem.sets ?? 3,
            reps: Number(editingItem.reps) || 12,
            weight: editingItem.weight ?? '',
            rest_seconds: editingItem.rest_seconds ?? 60,
            video_url: editingItem.exercise.video_url ?? undefined,
          }}
          onSave={handleSaveExercise}
        />
      ) : null}
    </TelaDeVidroComFoto>
  );
}

function CabecalhoDoTreino({
  workout,
  canManage,
  onVoltar,
  onAdicionar,
}: {
  workout: Workout;
  canManage: boolean;
  onVoltar: () => void;
  onAdicionar: () => void;
}) {
  return (
    <>
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onVoltar} />
        {canManage ? (
          <BotaoRedondo icone="plus" rotulo="Adicionar exercício" onPress={onAdicionar} />
        ) : null}
      </View>
      <View className="mt-[3.625rem]">
        <View className="mb-2.5 flex-row flex-wrap gap-1.5">
          {gruposDoTreino(workout).map((grupo) => (
            <Chip key={grupo}>{grupo}</Chip>
          ))}
        </View>
        <Text className="text-[1.875rem] font-bold leading-tight tracking-tight text-hero">
          {workout.title}
        </Text>
        {workout.description ? (
          <Text className="mt-[0.4375rem] text-[0.84375rem] leading-snug text-hero-secondary">
            {workout.description}
          </Text>
        ) : null}
      </View>
    </>
  );
}
