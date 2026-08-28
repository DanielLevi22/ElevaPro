import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ShareWorkoutModal } from '@/components/workout/ShareWorkoutModal';
import { WorkoutFeedbackModal } from '@/components/workout/WorkoutFeedbackModal';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { useWorkoutStore } from '../store/workoutStore';

const LOCATION_TASK_NAME = 'background-location-task';

// METs aproximados
const METS: Record<string, number> = {
  Caminhada: 3.5,
  Corrida: 8.0,
  Bicicleta: 6.0,
  Elíptico: 5.0,
  Natação: 7.0,
  Cardio: 5.0, // Default
};

export default function CardioSessionScreen() {
  const { exerciseName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { incrementWorkoutProgress } = useGamificationStore();
  const { saveCardioSession } = useWorkoutStore();

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [calories, setCalories] = useState(0);
  const [intensity, setIntensity] = useState<'Baixa' | 'Moderada' | 'Alta'>('Moderada');

  // Timestamp-based tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [lastFeedbackTime, setLastFeedbackTime] = useState(0);

  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStats, setShareStats] = useState({
    title: '',
    duration: '',
    calories: '',
    date: '',
    exerciseName: '',
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // User weight state (default 70kg)
  const [userWeight, setUserWeight] = useState(70);

  useEffect(() => {
    async function fetchUserWeight() {
      if (!user?.id) return;

      // Buscava `profiles.weight` e caía em `physical_assessments.weight` —
      // **as duas inexistentes**. As consultas falhavam com 42703, o erro era
      // engolido, e toda sessão de cardio calculava caloria com os 70 kg do
      // valor inicial, para qualquer pessoa.
      try {
        const { data: assessment, error } = await supabase
          .from('physical_assessments')
          .select('weight_kg')
          .eq('student_id', user.id)
          .not('weight_kg', 'is', null)
          .order('assessed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (assessment?.weight_kg) {
          setUserWeight(Number(assessment.weight_kg));
          return;
        }

        // Sem avaliação física, o peso declarado na anamnese vale mais que um
        // padrão inventado — é o próprio aluno que informou.
        const { data: anamnese } = await supabase
          .from('student_anamnesis')
          .select('responses')
          .eq('student_id', user.id)
          .maybeSingle();

        const declarado = (anamnese?.responses as Record<string, { value?: unknown }> | null)
          ?.weight?.value;

        if (typeof declarado === 'number' && declarado > 0) {
          setUserWeight(declarado);
        }
      } catch (error) {
        console.log('Error fetching weight:', error);
      }
    }

    fetchUserWeight();
  }, [user?.id]);

  // biome-ignore lint/complexity/useLiteralKeys: auto-suppressed during final sweep
  const met = METS[exerciseName as string] || METS['Cardio'] || 5.0;

  // Accelerometer logic
  useEffect(() => {
    let subscription: { remove: () => void };
    if (isActive) {
      Accelerometer.setUpdateInterval(1000); // Check every second
      subscription = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Simple heuristic for intensity based on movement magnitude
        // 1.0 is gravity (standing still)
        let newIntensity: 'Baixa' | 'Moderada' | 'Alta' = 'Baixa';
        if (magnitude > 1.8) {
          newIntensity = 'Alta';
        } else if (magnitude > 1.2) {
          newIntensity = 'Moderada';
        }

        if (newIntensity !== intensity) {
          setIntensity(newIntensity);
          Speech.speak(`Intensidade ${newIntensity}`, { language: 'pt-BR' });
        }
      });
    }
    return () => subscription?.remove();
  }, [isActive, intensity]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diffSeconds = Math.floor((now - startTime) / 1000);
        const totalSeconds = accumulatedSeconds + diffSeconds;

        setSeconds(totalSeconds);

        // Calculate calories: MET * Weight(kg) * Time(hours)
        const calsPerSec = (met * userWeight) / 3600;
        setCalories(totalSeconds * calsPerSec);

        // Target Time Feedback
        if (targetMinutes && totalSeconds === targetMinutes * 60) {
          Speech.speak(`Parabéns! Você atingiu sua meta de ${targetMinutes} minutos.`, {
            language: 'pt-BR',
          });
        }

        // Voice Feedback every 5 minutes (300 seconds)
        // Check if we crossed a 5-minute threshold since the last feedback
        if (totalSeconds >= lastFeedbackTime + 300) {
          const mins = Math.floor(totalSeconds / 60);
          const cals = Math.round(totalSeconds * calsPerSec);

          Speech.speak(
            `Você já treinou ${mins} minutos e gastou ${cals} calorias. Continue assim!`,
            {
              language: 'pt-BR',
            }
          );

          // Update last feedback time to the current 5-minute mark
          // This prevents spamming if the app was in background for a long time
          const nextFeedbackMark = Math.floor(totalSeconds / 300) * 300;
          setLastFeedbackTime(nextFeedbackMark);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, startTime, accumulatedSeconds, met, userWeight, targetMinutes, lastFeedbackTime]);

  // Handle AppState (Background/Foreground) to ensure timer consistency
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isActive && startTime) {
        // Immediately update timer when coming back to foreground
        const now = Date.now();
        const diffSeconds = Math.floor((now - startTime) / 1000);
        const totalSeconds = accumulatedSeconds + diffSeconds;
        setSeconds(totalSeconds);

        // Also update calories
        const calsPerSec = (met * userWeight) / 3600;
        setCalories(totalSeconds * calsPerSec);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, startTime, accumulatedSeconds, met, userWeight]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours > 0 ? `${hours}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const handleStart = useCallback(async () => {
    setIsActive(true);
    setStartTime(Date.now());
    if (!sessionStartTime) setSessionStartTime(new Date());

    // Start Background Service (Android) / Live Updates (iOS)
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus === 'granted') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus === 'granted') {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10, // Update every 10 meters
            deferredUpdatesInterval: 5000,
            foregroundService: {
              notificationTitle: 'Treino em Andamento 🏃',
              notificationBody: 'Seu cardio está sendo monitorado.',
              notificationColor: '#FF6B35',
            },
          });
        }
      }
    } catch (e) {
      console.log('Error starting background location:', e);
    }
  }, [sessionStartTime]);

  const handlePause = useCallback(async () => {
    setIsActive(false);
    if (startTime) {
      const now = Date.now();
      const diffSeconds = Math.floor((now - startTime) / 1000);
      setAccumulatedSeconds((prev) => prev + diffSeconds);
      setStartTime(null);
    }

    // Stop Background Service
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (e) {
      console.log('Error stopping background location:', e);
    }
  }, [startTime]);

  const handlePresetSelect = useCallback(
    (min: number) => {
      if (targetMinutes === min) {
        setTargetMinutes(null);
        setCustomMinutes('');
      } else {
        setTargetMinutes(min);
        setCustomMinutes(min.toString());
      }
    },
    [targetMinutes]
  );

  const handleCustomChange = useCallback((text: string) => {
    setCustomMinutes(text);
    const val = parseInt(text, 10);
    if (!Number.isNaN(val) && val > 0) {
      setTargetMinutes(val);
    } else {
      setTargetMinutes(null);
    }
  }, []);

  const onFeedbackSubmit = useCallback(
    async (intensity: number, notes: string) => {
      setShowFeedbackModal(false);

      if (!user?.id || !sessionStartTime) return;

      const endTime = new Date();
      const finalCalories = Math.round(calories);
      const finalTime = formatTime(seconds);
      const finalExerciseName = (exerciseName as string) || 'Cardio Livre';

      try {
        // Save session
        await saveCardioSession({
          studentId: user.id,
          exerciseName: finalExerciseName,
          durationSeconds: seconds,
          calories: calories,
          startedAt: sessionStartTime.toISOString(),
          completedAt: endTime.toISOString(),
          intensity,
          notes,
        });

        // Update gamification
        const today = getLocalDateISOString();
        await incrementWorkoutProgress(today);

        showConfirm({
          title: 'Treino Salvo! 🎉',
          message: `Tempo: ${finalTime}\nCalorias: ${finalCalories} kcal`,
          type: 'success',
          confirmText: 'Compartilhar 📸',
          cancelText: 'Sair',
          onConfirm: () => {
            setShareStats({
              title: 'Cardio Finalizado',
              duration: finalTime,
              calories: `${finalCalories} kcal`,
              date: new Date().toLocaleDateString('pt-BR'),
              exerciseName: finalExerciseName,
            });
            setShowShareModal(true);
          },
          onCancel: () => router.navigate('/(tabs)/cardio'),
        });
      } catch (error) {
        console.error(error);
        showAlert({ title: 'Erro', message: 'Erro ao salvar treino.', type: 'error' });
      }
    },
    [
      user?.id,
      sessionStartTime,
      calories,
      seconds,
      exerciseName,
      saveCardioSession,
      incrementWorkoutProgress,
      formatTime,
      router,
    ]
  );
  const handleFinish = useCallback(() => {
    handlePause();
    setShowFeedbackModal(true);
  }, [handlePause]);

  return (
    <ScreenLayout>
      <View className="flex-1 p-6 pb-32 justify-between">
        {/* Header */}
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          <View className="items-center flex-1 mr-10">
            <Text className="text-zinc-400 text-xs font-sans uppercase tracking-widest">
              Sessão de Cardio
            </Text>
            <Text className="text-white text-2xl font-bold font-display text-center">
              {exerciseName || 'Exercício Livre'}
            </Text>
            <View className="bg-zinc-800 px-2 py-0.5 rounded-full mt-1">
              <Text className="text-zinc-400 text-[10px] font-bold">
                Intensidade: <Text className="text-orange-500">{intensity}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Main Stats */}
        <View className="items-center justify-center">
          {/* Timer Circle */}
          <View className="w-64 h-64 rounded-full border-8 border-zinc-800 items-center justify-center mb-8 relative">
            <View className="absolute w-full h-full rounded-full border-8 border-orange-500 opacity-20" />
            <Text className="text-6xl font-mono font-bold text-white tracking-tighter">
              {formatTime(seconds)}
            </Text>
            <Text className="text-zinc-500 text-sm font-bold uppercase mt-2">
              {targetMinutes ? `Meta: ${targetMinutes} min` : 'Duração'}
            </Text>
          </View>

          {/* Calories */}
          <View className="flex-row items-end">
            <Text className="text-5xl font-bold text-white font-display">
              {Math.round(calories)}
            </Text>
            <Text className="text-zinc-500 text-lg font-bold mb-2 ml-2">kcal</Text>
          </View>
          <Text className="text-zinc-600 text-xs mt-1">Estimado (~{met} METs)</Text>
        </View>

        {/* Target Time Selection (Only when not active and 0 seconds) */}
        {!isActive && seconds === 0 && (
          <View className="mb-4 w-full">
            <Text className="text-zinc-400 text-xs font-bold uppercase mb-3 text-center">
              Definir Meta de Tempo
            </Text>

            {/* Presets */}
            <View className="flex-row flex-wrap justify-center gap-3 mb-4">
              {[15, 30, 45, 60].map((min) => (
                <TouchableOpacity
                  key={`min-${min}`}
                  onPress={() => handlePresetSelect(min)}
                  className={`px-5 py-2 rounded-xl border ${
                    targetMinutes === min
                      ? 'bg-orange-500 border-orange-500'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                >
                  <Text
                    className={`font-bold ${targetMinutes === min ? 'text-white' : 'text-zinc-400'}`}
                  >
                    {min} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Input - Integrated Design */}
            <View className="flex-row items-center justify-center mt-2">
              <View
                className={`flex-row items-center bg-zinc-800 rounded-xl border ${customMinutes ? 'border-orange-500' : 'border-zinc-700'} px-5 py-3`}
              >
                <TextInput
                  keyboardType="number-pad"
                  className="text-white font-bold text-2xl w-20 text-center p-0"
                  placeholder="00"
                  placeholderTextColor="#52525B"
                  value={customMinutes}
                  onChangeText={handleCustomChange}
                  maxLength={3}
                />
                <Text className="text-zinc-500 font-bold text-base ml-2">min</Text>
              </View>
            </View>
          </View>
        )}

        {/* Controls */}
        <View className="mb-8">
          {!isActive && seconds === 0 ? (
            <TouchableOpacity onPress={handleStart} activeOpacity={0.8}>
              <LinearGradient
                colors={['#FF6B35', '#FF2E63']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-xl py-4 items-center justify-center"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="play" size={24} color="white" />
                  <Text className="text-white text-lg font-bold font-display">INICIAR</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-4">
              {isActive ? (
                <TouchableOpacity
                  onPress={handlePause}
                  className="flex-1 bg-zinc-800 py-5 rounded-2xl items-center justify-center border border-zinc-700"
                >
                  <Ionicons name="pause" size={28} color="white" />
                  <Text className="text-white font-bold mt-1">PAUSAR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStart}
                  className="flex-1 bg-emerald-600 py-5 rounded-2xl items-center justify-center"
                >
                  <Ionicons name="play" size={28} color="white" />
                  <Text className="text-white font-bold mt-1">RETOMAR</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleFinish}
                className="flex-1 bg-zinc-900 py-5 rounded-2xl items-center justify-center border border-zinc-800"
              >
                <Ionicons name="stop" size={28} color="#EF4444" />
                <Text className="text-red-500 font-bold mt-1">FINALIZAR</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ShareWorkoutModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            router.navigate('/(tabs)/cardio');
          }}
          stats={shareStats}
        />

        <WorkoutFeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={onFeedbackSubmit}
        />
      </View>
    </ScreenLayout>
  );
}
