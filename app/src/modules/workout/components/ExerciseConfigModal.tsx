import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { Exercise, SelectedExercise } from '../store/workoutStore';

interface Props {
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

export const ExerciseConfigModal: React.FC<Props> = ({
  visible,
  onClose,
  exercise,
  initialData,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [weight, setWeight] = useState('');
  const [restSeconds, setRestSeconds] = useState('60');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    // Only initialize when modal becomes visible
    if (!visible) return;

    console.log('🔄 ExerciseConfigModal useEffect triggered');
    console.log('📦 initialData:', initialData);
    console.log('👁️ visible:', visible);

    if (initialData) {
      setSets(String(initialData.sets));
      setReps(String(initialData.reps));
      setWeight(initialData.weight);
      setRestSeconds(String(initialData.rest_seconds));
      setVideoUrl(initialData.video_url ?? '');
      console.log('🔄 ExerciseConfigModal initialized with video_url:', initialData.video_url);
      console.log('✅ videoUrl state set to:', initialData.video_url ?? '(empty)');
    } else {
      setSets('3');
      setReps('12');
      setWeight('');
      setRestSeconds('60');
      setVideoUrl('');
      console.log('⚠️ No initialData, using defaults');
    }
  }, [visible]); // Only re-run when visibility changes

  const handleSave = useCallback(async () => {
    const setsNum = parseInt(sets, 10) || 3;
    const repsNum = parseInt(reps, 10) || 12;
    const restNum = parseInt(restSeconds, 10) || 60;
    if (setsNum < 1 || repsNum < 1 || restNum < 0) {
      showAlert({ title: 'Erro', message: 'Por favor, insira valores válidos.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const result: SelectedExercise = {
        id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group || '',
        sets: setsNum,
        reps: repsNum,
        weight: weight,
        rest_seconds: restNum,
        video_url: videoUrl.trim() || undefined,
      };
      onSave(result);

      // Show success state briefly before closing
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onClose();
      }, 800); // Show success for 800ms
    } catch (_e) {
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar as alterações.',
        type: 'error',
      });
      setSaving(false);
    }
  }, [sets, reps, restSeconds, weight, videoUrl, exercise, onSave, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-end">
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

        <View
          className="rounded-t-[32px] overflow-hidden"
          style={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
        >
          <LinearGradient colors={['#18181b', '#000000']} className="absolute inset-0" />

          <View className="p-6">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-black text-white italic font-display tracking-tighter">
                  Configurar
                </Text>
                <Text className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                  Detalhes do Exercício
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 bg-white/5 border border-white/10 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#E4E4E7" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Exercise Card */}
              <View className="bg-white/5 p-4 rounded-2xl mb-8 border border-white/10">
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/20">
                    <Text className="text-orange-500 text-[9px] font-black uppercase tracking-widest">
                      {exercise.muscle_group || 'Geral'}
                    </Text>
                  </View>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>
                <Text className="text-white text-xl font-bold font-display italic">
                  {exercise.name}
                </Text>
              </View>

              {/* Stats Grid */}
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1">
                  <Text className="text-zinc-500 text-[10px] uppercase font-bold mb-2 ml-1">
                    Séries
                  </Text>
                  <View className="bg-black/40 border border-zinc-800 rounded-xl flex-row items-center overflow-hidden h-14">
                    <View className="w-10 h-full items-center justify-center border-r border-white/5 bg-white/5">
                      <Ionicons name="repeat-outline" size={18} color="#A1A1AA" />
                    </View>
                    <TextInput
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                      className="flex-1 text-white text-lg font-bold text-center h-full"
                      placeholderTextColor="#52525B"
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-zinc-500 text-[10px] uppercase font-bold mb-2 ml-1">
                    Repetições
                  </Text>
                  <View className="bg-black/40 border border-zinc-800 rounded-xl flex-row items-center overflow-hidden h-14">
                    <View className="w-10 h-full items-center justify-center border-r border-white/5 bg-white/5">
                      <Ionicons name="fitness-outline" size={18} color="#A1A1AA" />
                    </View>
                    <TextInput
                      value={reps}
                      onChangeText={setReps}
                      keyboardType="number-pad"
                      className="flex-1 text-white text-lg font-bold text-center h-full"
                      placeholderTextColor="#52525B"
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-zinc-500 text-[10px] uppercase font-bold mb-2 ml-1">
                    Descanso (s)
                  </Text>
                  <View className="bg-black/40 border border-zinc-800 rounded-xl flex-row items-center overflow-hidden h-14">
                    <View className="w-10 h-full items-center justify-center border-r border-white/5 bg-white/5">
                      <Ionicons name="timer-outline" size={18} color="#A1A1AA" />
                    </View>
                    <TextInput
                      value={restSeconds}
                      onChangeText={setRestSeconds}
                      keyboardType="number-pad"
                      className="flex-1 text-white text-lg font-bold text-center h-full"
                      placeholderTextColor="#52525B"
                    />
                  </View>
                </View>
              </View>

              {/* Weight Input */}
              <View className="mb-6">
                <Text className="text-zinc-500 text-[10px] uppercase font-bold mb-2 ml-1">
                  Carga (kg)
                </Text>
                <View className="bg-black/40 border border-zinc-800 rounded-xl flex-row items-center overflow-hidden h-14">
                  <View className="w-12 h-full items-center justify-center border-r border-white/5 bg-white/5">
                    <Ionicons name="barbell-outline" size={20} color="#A1A1AA" />
                  </View>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    className="flex-1 text-white text-lg font-bold px-4 h-full"
                  />
                  <Text className="text-zinc-600 font-bold mr-4">KG</Text>
                </View>
              </View>

              <View className="mb-8">
                <Text className="text-zinc-500 text-[10px] uppercase font-bold mb-2 ml-1">
                  Link do Vídeo (YouTube)
                </Text>
                <View className="bg-black/40 border border-zinc-800 rounded-xl flex-row items-center overflow-hidden mb-3 h-14">
                  <View className="w-12 h-full items-center justify-center border-r border-white/5 bg-white/5">
                    <Ionicons name="logo-youtube" size={20} color="#ef4444" />
                  </View>
                  <TextInput
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    placeholder="https://youtube.com/..."
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                    className="flex-1 text-white text-sm px-4 h-full"
                  />
                </View>
                {videoUrl.trim() ? (
                  <View className="rounded-xl overflow-hidden border border-zinc-800 bg-black">
                    <VideoPlayer videoUrl={videoUrl.trim()} height={180} />
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saving}
                className="shadow-lg shadow-orange-500/20"
              >
                <LinearGradient
                  colors={
                    showSuccess
                      ? ['#10b981', '#059669']
                      : saving
                        ? ['#52525b', '#52525b']
                        : ['#FF6B35', '#E85A2A']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="rounded-2xl py-4 items-center"
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : showSuccess ? (
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text className="text-white text-base font-black uppercase tracking-widest">
                        Salvo!
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white text-base font-black uppercase tracking-widest">
                      {initialData ? 'Salvar Alterações' : 'Adicionar Exercício'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};
