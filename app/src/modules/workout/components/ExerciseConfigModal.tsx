import { MUSCLE_GROUP_LABELS } from '@elevapro/shared';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { Exercise, SelectedExercise } from '../store/workoutStore';

interface ExerciseConfigModalProps {
  visible: boolean;
  onClose: () => void;
  // Só as três colunas que a tela usa. Pedir o `Exercise` inteiro obrigava as
  // duas telas chamadoras a montar um objeto de mentira campo a campo — e cada
  // coluna nova em `exercises` quebrava as duas sem que nada aqui precisasse
  // dela.
  exercise: Pick<Exercise, 'id' | 'name' | 'muscle_group'>;
  initialData?: SelectedExercise;
  onSave: (data: SelectedExercise) => void;
}

const MUSCLE_LABELS: Readonly<Record<string, string>> = MUSCLE_GROUP_LABELS;

const SETS_PADRAO = '3';
const REPS_PADRAO = '12';
const DESCANSO_PADRAO = '60';

export function ExerciseConfigModal({
  visible,
  onClose,
  exercise,
  initialData,
  onSave,
}: ExerciseConfigModalProps) {
  const [sets, setSets] = useState(SETS_PADRAO);
  const [reps, setReps] = useState(REPS_PADRAO);
  const [weight, setWeight] = useState('');
  const [restSeconds, setRestSeconds] = useState(DESCANSO_PADRAO);
  const [videoUrl, setVideoUrl] = useState('');

  // Só quando a folha abre: trocar `initialData` com ela já aberta não pode
  // apagar o que a pessoa está digitando.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentário acima
  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setSets(String(initialData.sets));
      setReps(String(initialData.reps));
      setWeight(initialData.weight);
      setRestSeconds(String(initialData.rest_seconds));
      setVideoUrl(initialData.video_url ?? '');
    } else {
      setSets(SETS_PADRAO);
      setReps(REPS_PADRAO);
      setWeight('');
      setRestSeconds(DESCANSO_PADRAO);
      setVideoUrl('');
    }
  }, [visible]);

  const handleSave = useCallback(() => {
    const setsNum = parseInt(sets, 10) || 3;
    const repsNum = parseInt(reps, 10) || 12;
    const restNum = parseInt(restSeconds, 10) || 60;
    if (setsNum < 1 || repsNum < 1 || restNum < 0) {
      showAlert({ title: 'Erro', message: 'Por favor, insira valores válidos.', type: 'error' });
      return;
    }
    onSave({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group || '',
      sets: setsNum,
      reps: repsNum,
      weight,
      rest_seconds: restNum,
      video_url: videoUrl.trim() || undefined,
    });
  }, [sets, reps, restSeconds, weight, videoUrl, exercise, onSave]);

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      primary={{
        label: initialData ? 'Salvar alterações' : 'Adicionar exercício',
        onPress: handleSave,
      }}
      secondary={{ label: 'Cancelar', onPress: onClose }}
    >
      <Text className="text-h2 font-bold tracking-tight text-foreground">{exercise.name}</Text>
      <Text className="mb-4 mt-0.5 text-legenda uppercase tracking-wide text-muted-foreground">
        {MUSCLE_LABELS[exercise.muscle_group ?? ''] ?? exercise.muscle_group ?? 'Geral'}
      </Text>

      <Group header="Configuração">
        <Input
          icon="repeat-outline"
          placeholder="Séries"
          keyboardType="number-pad"
          value={sets}
          onChangeText={setSets}
        />
        <Input
          icon="fitness-outline"
          placeholder="Repetições"
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
        />
        <Input
          icon="barbell-outline"
          placeholder="Carga (kg)"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />
        <Input
          icon="timer-outline"
          placeholder="Descanso (s)"
          keyboardType="number-pad"
          value={restSeconds}
          onChangeText={setRestSeconds}
        />
      </Group>

      <Group header="Vídeo (opcional)">
        <Input
          icon="logo-youtube"
          placeholder="https://youtube.com/..."
          autoCapitalize="none"
          value={videoUrl}
          onChangeText={setVideoUrl}
        />
      </Group>

      {videoUrl.trim() ? (
        <View className="mb-2 overflow-hidden rounded-lg border border-border">
          <VideoPlayer videoUrl={videoUrl.trim()} height={180} />
        </View>
      ) : null}
    </GlassSheet>
  );
}

export type { ExerciseConfigModalProps };
