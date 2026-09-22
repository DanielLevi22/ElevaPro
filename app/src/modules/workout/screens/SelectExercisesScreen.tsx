import { EXERCISE_MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { useCreateExercise } from '@/hooks/useExerciseMutations';
import { useExercises } from '@/hooks/useExercises';
import { ExerciseConfigModal } from '../components/ExerciseConfigModal';
import type { Exercise, SelectedExercise } from '../store/workoutStore';
import { useWorkoutStore } from '../store/workoutStore';

const MUSCLE_LABELS: Readonly<Record<string, string>> = MUSCLE_GROUP_LABELS;

// Rows de seed antigo gravaram o placeholder como se fosse exercício de verdade.
function isCatalogEntry(exercise: Exercise): boolean {
  const nome = exercise.name?.trim().toLowerCase() ?? '';
  return nome.length > 0 && !nome.includes('adicionar exerc');
}

export default function SelectExercisesScreen() {
  const { data: rawExercisesData = [], isLoading } = useExercises();
  const exercisesData = rawExercisesData as Exercise[];
  const createExerciseMutation = useCreateExercise();
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { workouts, addWorkoutItems } = useWorkoutStore();

  const activeWorkout = useMemo(
    () => workouts.find((w) => w.id === workoutId) ?? null,
    [workouts, workoutId]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

  const exercises = useMemo(
    () =>
      exercisesData.filter((ex) => {
        if (!isCatalogEntry(ex)) return false;
        if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedMuscleGroup && ex.muscle_group !== selectedMuscleGroup) return false;
        return true;
      }),
    [exercisesData, searchQuery, selectedMuscleGroup]
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string | null>(null);
  const [newExerciseVideo, setNewExerciseVideo] = useState('');

  const openConfigForNew = useCallback((exercise: Exercise) => {
    setCurrentExercise(exercise);
    setEditingIndex(null);
    setShowConfigModal(true);
  }, []);

  const editSelectedExercise = useCallback(
    (exercise: Exercise) => {
      const index = selectedExercises.findIndex((ex) => ex.id === exercise.id);
      if (index !== -1) {
        setCurrentExercise(exercise);
        setEditingIndex(index);
        setShowConfigModal(true);
      }
    },
    [selectedExercises]
  );

  const toggleSelection = useCallback(
    (exercise: Exercise) => {
      if (selected.includes(exercise.id)) {
        editSelectedExercise(exercise);
      } else {
        openConfigForNew(exercise);
      }
    },
    [selected, editSelectedExercise, openConfigForNew]
  );

  const handleSaveExercise = useCallback(
    (updatedExercise: SelectedExercise) => {
      if (editingIndex !== null) {
        const updated = [...selectedExercises];
        updated[editingIndex] = updatedExercise;
        setSelectedExercises(updated);
      } else {
        setSelected([...selected, updatedExercise.id]);
        setSelectedExercises([...selectedExercises, updatedExercise]);
      }
      setShowConfigModal(false);
      setCurrentExercise(null);
      setEditingIndex(null);
    },
    [editingIndex, selected, selectedExercises]
  );

  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
    setEditingIndex(null);
    setCurrentExercise(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!workoutId || isAdding) return;
    setIsAdding(true);
    try {
      const items = selectedExercises.map((ex, index) => ({
        id: `temp-${ex.id}-${index}`,
        workout_id: workoutId,
        exercise_id: ex.id,
        sets: ex.sets || 3,
        reps: ex.reps?.toString() || '10',
        weight: ex.weight || '0',
        rest_seconds: ex.rest_seconds || 60,
        order_index: index,
        notes: null,
        created_at: new Date().toISOString(),
      }));

      await addWorkoutItems(workoutId, items as Parameters<typeof addWorkoutItems>[1]);
      router.back();
    } catch (error) {
      console.error('Error adding exercises:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível adicionar os exercícios.',
        type: 'error',
      });
      setIsAdding(false);
    }
  }, [selectedExercises, router, workoutId, addWorkoutItems, isAdding]);

  const handleCreateExercise = useCallback(async () => {
    if (!newExerciseName.trim() || !newExerciseMuscle) {
      showAlert({ title: 'Erro', message: 'Preencha o nome e o grupo muscular.', type: 'error' });
      return;
    }

    try {
      await createExerciseMutation.mutateAsync({
        name: newExerciseName,
        muscle_group: newExerciseMuscle,
        video_url: newExerciseVideo.trim() || undefined,
      });
      setNewExerciseName('');
      setNewExerciseMuscle(null);
      setNewExerciseVideo('');
      setShowCreateModal(false);
    } catch (_error) {
      // Erro já mostrado pelo hook da mutation.
    }
  }, [newExerciseName, newExerciseMuscle, newExerciseVideo, createExerciseMutation]);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewExerciseName('');
    setNewExerciseMuscle(null);
    setNewExerciseVideo('');
  }, []);

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        selected.length > 0 ? (
          <BotaoFixoNoRodape
            rotulo={
              isAdding
                ? 'Adicionando…'
                : `Adicionar ${selected.length} exercício${selected.length === 1 ? '' : 's'}`
            }
            icone="arrow-forward"
            onPress={handleConfirm}
          />
        ) : undefined
      }
    >
      <ProgressHeader
        size="page"
        eyebrow={activeWorkout?.title ?? 'Montagem do treino'}
        title="Biblioteca"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={
          <BotaoRedondo
            icone="plus"
            rotulo="Novo exercício"
            onPress={() => setShowCreateModal(true)}
          />
        }
      />

      <View className="mt-4">
        <GlassSearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar exercício…"
        />
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        <TouchableOpacity
          onPress={() => setSelectedMuscleGroup(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMuscleGroup === null }}
        >
          <Chip tom={selectedMuscleGroup === null ? 'destaque' : 'neutro'}>Todos</Chip>
        </TouchableOpacity>
        {EXERCISE_MUSCLE_GROUPS.map((grupo) => (
          <TouchableOpacity
            key={grupo}
            onPress={() => setSelectedMuscleGroup(grupo)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedMuscleGroup === grupo }}
          >
            <Chip tom={selectedMuscleGroup === grupo ? 'destaque' : 'neutro'}>
              {MUSCLE_LABELS[grupo]}
            </Chip>
          </TouchableOpacity>
        ))}
      </View>

      <TituloDeSecao estilo="rotulo" acao={`${selected.length} selecionados`}>
        {isLoading ? 'Carregando…' : `Resultados · ${exercises.length}`}
      </TituloDeSecao>

      {exercises.length === 0 && !isLoading ? (
        <Text className="mt-2 text-[0.8125rem] text-muted-foreground">
          Nenhum exercício encontrado. Tente buscar por outro termo ou trocar o filtro.
        </Text>
      ) : (
        exercises.map((item) => (
          <Row
            key={item.id}
            icon="barbell-outline"
            title={item.name}
            sub={MUSCLE_LABELS[item.muscle_group ?? ''] ?? item.muscle_group ?? 'Geral'}
            selected={selected.includes(item.id)}
            onPress={() => toggleSelection(item)}
          />
        ))
      )}

      <ExerciseConfigModal
        visible={showConfigModal}
        onClose={handleCloseConfigModal}
        exercise={
          currentExercise || {
            id: '',
            name: '',
            muscle_group: '',
          }
        }
        initialData={editingIndex !== null ? selectedExercises[editingIndex] : undefined}
        onSave={handleSaveExercise}
      />

      <GlassSheet
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        busy={createExerciseMutation.isPending}
        primary={{ label: 'Salvar exercício', onPress: handleCreateExercise }}
        secondary={{ label: 'Cancelar', onPress: handleCloseCreateModal }}
      >
        <Text className="text-h2 font-bold tracking-tight text-foreground">Novo exercício</Text>
        <Text className="mb-4 mt-0.5 text-legenda text-muted-foreground">
          Adiciona ao catálogo global, disponível pro app inteiro.
        </Text>

        <Group>
          <Input
            icon="barbell-outline"
            placeholder="Nome do exercício"
            value={newExerciseName}
            onChangeText={setNewExerciseName}
          />
          <Input
            icon="link-outline"
            placeholder="URL do vídeo (opcional)"
            autoCapitalize="none"
            value={newExerciseVideo}
            onChangeText={setNewExerciseVideo}
          />
        </Group>

        <TituloDeSecao estilo="rotulo">Grupo muscular</TituloDeSecao>
        <View className="flex-row flex-wrap gap-1.5">
          {EXERCISE_MUSCLE_GROUPS.map((grupo) => (
            <TouchableOpacity
              key={grupo}
              onPress={() => setNewExerciseMuscle(grupo)}
              accessibilityRole="button"
              accessibilityState={{ selected: newExerciseMuscle === grupo }}
            >
              <Chip tom={newExerciseMuscle === grupo ? 'destaque' : 'neutro'}>
                {MUSCLE_LABELS[grupo]}
              </Chip>
            </TouchableOpacity>
          ))}
        </View>
      </GlassSheet>
    </GlassScreen>
  );
}
