import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { WorkoutItem } from '../types';

interface EditExerciseModalProps {
  visible: boolean;
  item: WorkoutItem | null;
  onClose: () => void;
  onSave: (editedItem: WorkoutItem) => void;
}

export function EditExerciseModal({ visible, item, onClose, onSave }: EditExerciseModalProps) {
  const { abilities } = useAuthStore();
  const canEditVideo = abilities?.can('update', 'Exercise');

  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [restTime, setRestTime] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && visible) {
      setSets(String(item.sets));
      setReps(String(item.reps));
      setWeight(String(item.weight || ''));
      setRestTime(String(item.rest_seconds || 60));
      setVideoUrl(item.exercise?.video_url || '');
      console.log('🔄 EditExerciseModal initialized with video_url:', item.exercise?.video_url);
    }
  }, [
    item?.id,
    visible,
    item?.exercise?.video_url,
    item?.reps,
    item?.rest_seconds,
    item?.sets,
    item,
  ]); // Only re-run when item ID or visibility changes

  const handleSave = async () => {
    setIsSaving(true);
    if (!item) return;

    // Validação
    const setsNum = parseInt(sets, 10);
    const _repsNum = parseInt(reps, 10) || 0;
    const _weightNum = parseFloat(weight) || 0;
    const restNum = parseInt(restTime, 10);

    if (!sets || setsNum <= 0) {
      showAlert({
        title: 'Erro',
        message: 'Séries deve ser um número maior que zero',
        type: 'error',
      });
      setIsSaving(false);
      return;
    }

    if (!reps.trim()) {
      showAlert({ title: 'Erro', message: 'Repetições não pode estar vazio', type: 'error' });
      setIsSaving(false);
      return;
    }

    if (!restTime || restNum < 0) {
      showAlert({
        title: 'Erro',
        message: 'Tempo de descanso deve ser um número positivo',
        type: 'error',
      });
      setIsSaving(false);
      return;
    }

    console.log('🎬 === SAVE FROM EDIT MODAL ===');
    console.log('📝 Current videoUrl state:', videoUrl);
    console.log('📝 Original video_url:', item.exercise?.video_url);
    console.log('📝 Exercise ID:', item.exercise?.id);
    console.log('📝 Are they different?', videoUrl !== item.exercise?.video_url);

    // Update video URL if changed or if adding a new URL
    // Only verify if user has permission
    if (canEditVideo && item.exercise?.id) {
      const trimmedVideoUrl = videoUrl.trim();
      const originalVideoUrl = item.exercise?.video_url || '';

      if (trimmedVideoUrl !== originalVideoUrl) {
        console.log('🎥 Updating video URL from EditExerciseModal:', {
          exerciseId: item.exercise.id,
          oldUrl: originalVideoUrl,
          newUrl: trimmedVideoUrl,
        });

        const { data: updateResult, error: videoError } = await supabase
          .from('exercises')
          .update({ video_url: trimmedVideoUrl || null })
          .eq('id', item.exercise.id)
          .select();

        console.log('📊 Update result:', updateResult);

        if (videoError) {
          console.error('❌ Error updating video URL:', videoError);
          showAlert({
            title: 'Erro',
            message: `Não foi possível atualizar a URL do vídeo: ${videoError.message}`,
            type: 'error',
          });
          setIsSaving(false);
          return;
        }

        console.log('✅ Video URL updated successfully');
      } else {
        console.log('⏭️ Video URL unchanged, skipping update');
      }
    }

    const editedItem: WorkoutItem = {
      ...item,
      sets: setsNum,
      reps: reps.trim(),
      weight: weight.trim(),
      rest_seconds: restNum,
      exercise: item.exercise
        ? {
            ...item.exercise,
            video_url: canEditVideo ? videoUrl.trim() || null : item.exercise.video_url,
          }
        : undefined,
    };

    onSave(editedItem);
    setIsSaving(false);
    onClose();
  };

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center bg-black/90 p-6">
          <View className="w-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden max-w-md">
            {/* Header */}
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-6"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-4">
                  <Text className="text-white text-2xl font-black font-display uppercase tracking-tight mb-1">
                    Editar Exercício
                  </Text>
                  <Text className="text-white/80 text-sm font-medium" numberOfLines={2}>
                    {item.exercise?.name || 'Exercício'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-white/20 p-2 rounded-xl backdrop-blur-md"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Form */}
            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              {/* Séries */}
              <View className="mb-5">
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Séries
                </Text>
                <View className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <TextInput
                    value={sets}
                    onChangeText={setSets}
                    keyboardType="number-pad"
                    placeholder="Ex: 3"
                    placeholderTextColor="#52525B"
                    className="text-white text-lg font-bold px-4 py-4"
                  />
                </View>
              </View>

              {/* Repetições */}
              <View className="mb-5">
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Repetições
                </Text>
                <View className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <TextInput
                    value={reps}
                    onChangeText={setReps}
                    placeholder="Ex: 8-10 ou 12"
                    placeholderTextColor="#52525B"
                    className="text-white text-lg font-bold px-4 py-4"
                  />
                </View>
              </View>

              {/* Carga */}
              <View className="mb-5">
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Carga (kg)
                </Text>
                <View className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex-row items-center">
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="Ex: 20"
                    placeholderTextColor="#52525B"
                    className="text-white text-lg font-bold px-4 py-4 flex-1"
                  />
                  <Text className="text-zinc-600 text-sm font-bold pr-4">kg</Text>
                </View>
              </View>

              {/* Tempo de Descanso */}
              <View className="mb-6">
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Descanso (segundos)
                </Text>
                <View className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex-row items-center">
                  <TextInput
                    value={restTime}
                    onChangeText={setRestTime}
                    keyboardType="number-pad"
                    placeholder="Ex: 60"
                    placeholderTextColor="#52525B"
                    className="text-white text-lg font-bold px-4 py-4 flex-1"
                  />
                  <Text className="text-zinc-600 text-sm font-bold pr-4">seg</Text>
                </View>
              </View>

              {/* Video URL - Only for Professionals */}
              {canEditVideo && (
                <View className="mb-6">
                  <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                    Link do Vídeo (YouTube)
                  </Text>
                  <View className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden mb-3">
                    <View className="flex-row items-center">
                      <View className="w-12 h-14 items-center justify-center border-r border-zinc-800">
                        <Ionicons name="logo-youtube" size={20} color="#ef4444" />
                      </View>
                      <TextInput
                        value={videoUrl}
                        onChangeText={setVideoUrl}
                        placeholder="https://youtube.com/..."
                        placeholderTextColor="#52525B"
                        autoCapitalize="none"
                        className="text-white text-sm px-4 flex-1 h-14"
                      />
                    </View>
                  </View>
                  {videoUrl.trim() ? (
                    <View className="rounded-xl overflow-hidden border border-zinc-800 bg-black">
                      <VideoPlayer videoUrl={videoUrl.trim()} height={180} />
                    </View>
                  ) : null}
                </View>
              )}

              {/* Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 bg-zinc-800 py-4 rounded-2xl border border-zinc-700"
                >
                  <Text className="text-white text-center font-black text-sm uppercase tracking-widest">
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSave} className="flex-1" disabled={isSaving}>
                  <LinearGradient
                    colors={isSaving ? ['#52525b', '#52525b'] : ['#FF6B35', '#FF2E63']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="py-4 rounded-2xl"
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white text-center font-black text-sm uppercase tracking-widest">
                        Salvar
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
