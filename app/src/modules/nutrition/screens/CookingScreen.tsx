import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { type CookingStep, ShoppingListService } from '../services/ShoppingListService';
import { useNutritionStore } from '../store/nutritionStore';

export default function CookingScreen() {
  useKeepAwake(); // Keep screen on!
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealName = params.mealName as string;
  const mealId = params.mealId as string;

  const ingredients = params.ingredients ? JSON.parse(params.ingredients as string) : [];

  const { toggleMealCompletion } = useNutritionStore();
  const { user } = useAuthStore();

  const [steps, setSteps] = useState<CookingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadSteps is stable (no reactive deps) — avoids extra useCallback refactor
  useEffect(() => {
    loadSteps();
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const loadSteps = async () => {
    try {
      const result = await ShoppingListService.generateCookingSteps(mealName, ingredients);
      setSteps(result);
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível carregar o guia.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const speakStep = (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'pt-BR',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleNext = async () => {
    Speech.stop();
    setIsSpeaking(false);

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      // Construct timer for next step if exists
      const nextStep = steps[currentStepIndex + 1];
      if (nextStep.timerSeconds) {
        setTimeLeft(nextStep.timerSeconds);
        setIsTimerRunning(false);
      } else {
        setTimeLeft(0);
      }
    } else {
      // Finish
      if (mealId && user?.id) {
        const today = new Date().toISOString().split('T')[0];
        await toggleMealCompletion(mealId, today, true);
      }

      Alert.alert('Parabéns!', 'Refeição pronta! Bom apetite.', [
        { text: 'Concluir', onPress: () => router.back() },
      ]);
    }
  };

  const handlePrev = () => {
    Speech.stop();
    setIsSpeaking(false);

    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      const prevStep = steps[currentStepIndex - 1];
      if (prevStep.timerSeconds) {
        setTimeLeft(prevStep.timerSeconds);
        setIsTimerRunning(false);
      } else {
        setTimeLeft(0);
      }
    }
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-orange-500/10 p-8 rounded-full mb-8 animate-pulse">
            <Ionicons name="restaurant" size={64} color="#CCFF00" />
          </View>
          <Text className="text-white text-2xl font-bold font-display text-center mb-2">
            Preparando Cozinha...
          </Text>
          <Text className="text-zinc-400 text-center mb-8">
            A IA está organizando o passo a passo para {mealName || 'sua refeição'}.
          </Text>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      </ScreenLayout>
    );
  }

  if (!loading && steps.length === 0) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-white text-xl font-bold font-display text-center mt-4 mb-2">
            Erro ao carregar guia
          </Text>
          <Text className="text-zinc-400 text-center mb-6">
            Não foi possível gerar os passos de preparo. Tente novamente.
          </Text>
          <Button label="Voltar" onPress={() => router.back()} />
        </View>
      </ScreenLayout>
    );
  }

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-zinc-800 bg-zinc-900">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white font-display flex-1" numberOfLines={1}>
            {mealName}
          </Text>
        </View>
        <View className="bg-zinc-800 px-3 py-1 rounded-full">
          <Text className="text-zinc-400 text-xs font-bold">
            Passo {currentStepIndex + 1}/{steps.length}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="h-1 bg-zinc-800 w-full">
        <View className="h-full bg-orange-500" style={{ width: `${progress}%` }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        {/* Instruction Card */}
        <View className="flex-1 justify-center">
          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 items-center shadow-lg relative overflow-hidden">
            {/* Huge Step Number Background */}
            <Text className="absolute -right-4 -bottom-4 text-[120px] font-bold text-zinc-800/50">
              {currentStepIndex + 1}
            </Text>

            <View className="bg-orange-500/20 p-4 rounded-full mb-6">
              <Ionicons name="flame" size={32} color="#CCFF00" />
            </View>

            <View className="flex-row items-center justify-center gap-3 mb-8">
              <Text className="text-white text-2xl font-bold text-center leading-9 font-display flex-1">
                {currentStep.instruction}
              </Text>
              <TouchableOpacity
                onPress={() => speakStep(currentStep.instruction)}
                className={`p-3 rounded-full ${isSpeaking ? 'bg-orange-500' : 'bg-zinc-800'}`}
              >
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium'}
                  size={24}
                  color={isSpeaking ? 'white' : '#A1A1AA'}
                />
              </TouchableOpacity>
            </View>

            {/* Timer */}
            {(currentStep.timerSeconds || 0) > 0 && (
              <View className="items-center mb-4 w-full">
                <Text className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">
                  Timer
                </Text>
                <TouchableOpacity
                  onPress={toggleTimer}
                  className={`flex-row items-center justify-center gap-4 px-8 py-4 rounded-2xl w-full border ${isTimerRunning ? 'bg-emerald-500/20 border-emerald-500' : 'bg-zinc-800 border-zinc-700'}`}
                >
                  <Ionicons
                    name={isTimerRunning ? 'pause' : 'play'}
                    size={24}
                    color={isTimerRunning ? '#34D399' : '#FFF'}
                  />
                  <Text
                    className={`text-4xl font-mono font-bold ${isTimerRunning ? 'text-emerald-400' : 'text-white'}`}
                  >
                    {formatTime(timeLeft > 0 ? timeLeft : currentStep.timerSeconds || 0)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View className="p-6 border-t border-zinc-800 bg-zinc-900 flex-row gap-4">
        <Button
          variant="outline"
          label="Anterior"
          onPress={handlePrev}
          className="flex-1"
          disabled={currentStepIndex === 0}
        />
        <Button
          variant="primary"
          label={currentStepIndex === steps.length - 1 ? 'Finalizar' : 'Próximo'}
          onPress={handleNext}
          className="flex-1 shadow-lg shadow-orange-500/20"
        />
      </View>
    </ScreenLayout>
  );
}
