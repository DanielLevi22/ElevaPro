import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import Animated, { SlideInDown } from 'react-native-reanimated';
import { showAlert } from '@/components/ui/appAlert';
import { mensagemDeErroBff } from '@/shared/bff';
import { AIWorkoutResponse, WorkoutAIService } from '../services/WorkoutAIService';
import { useWorkoutStore } from '../store/workoutStore';

interface AIWorkoutNegotiationModalProps {
  visible: boolean;
  onClose: () => void;
  trainingPlanId: string;
  split: string;
  goal: string;
  studentId?: string;
}

interface Message {
  id: string;
  type: 'ai' | 'user';
  text: string;
  workoutPlan?: AIWorkoutResponse['plan'];
}

export function AIWorkoutNegotiationModal({
  visible,
  onClose,
  split,
  goal,
}: AIWorkoutNegotiationModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<AIWorkoutResponse['plan'] | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const { exercises, fetchExercises } = useWorkoutStore();

  const level = 'Intermediário';

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    if (visible && messages.length === 0) {
      startInitialGeneration();
    }
  }, [visible]);

  const startInitialGeneration = async () => {
    setLoading(true);
    // Add "Thinking" placeholder or just show loader

    try {
      if (exercises.length === 0) await fetchExercises();

      const response = await WorkoutAIService.generateWorkoutStructure(
        split,
        goal,
        level,
        exercises,
        undefined
      );

      const aiMsg: Message = {
        id: Date.now().toString(),
        type: 'ai',
        text: response.explanation || 'Aqui está a sugestão de treino baseada no perfil do aluno.',
        workoutPlan: response.plan,
      };

      setMessages([aiMsg]);
      setCurrentPlan(response.plan);
    } catch (erro) {
      // `console.error` não existe num APK de release: o log some com o
      // aparelho do usuário, e a frase fixa não dizia qual das causas era.
      showAlert({
        title: 'Erro',
        message: mensagemDeErroBff(erro),
        type: 'error',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Simulate AI thinking and response for Refinement (To be implemented in Service later)
    // For now, we will re-call generate with extra context, treating it as a new generation with context
    // Ideally we would have a refinement endpoint.
    // Hack for MVP: Append user feedback to "userContext" and regenerate.

    try {
      const refinedContext = `O treinador pediu alteração: "${inputText}". Mantenha o que faz sentido mas atenda ao pedido.`;

      const response = await WorkoutAIService.generateWorkoutStructure(
        split,
        goal,
        level,
        exercises,
        refinedContext || undefined
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.explanation,
        workoutPlan: response.plan,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setCurrentPlan(response.plan);
    } catch (erro) {
      showAlert({ title: 'Erro', message: mensagemDeErroBff(erro), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    // Logic to save to store (similar to generateWorkoutsForPhase)
    if (!currentPlan) return;

    // Call store action to save (we might need to expose a method or just use the plan data)
    // For now, let's assume we pass the plan back or call a new store method.
    // Since generateWorkoutsForPhase is monolithic, we might need a `saveAIWorkout(planId, aiPlan)` method in store.
    // Or we can just modify generateWorkoutsForPhase to accept a plan?
    // Actually, let's notify user this part is next.
    showAlert({ title: 'Sucesso', message: 'Treino importado! (Simulação)', type: 'success' });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/80">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
        >
          <Animated.View
            entering={SlideInDown.springify().damping(15)}
            className="h-[85%] bg-zinc-900 rounded-t-3xl overflow-hidden border-t border-zinc-700"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 z-10">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sparkles" size={20} color="#F97316" />
                <Text className="text-white font-bold text-lg">Assistente I.A.</Text>
                <View className="bg-zinc-800 px-2 py-0.5 rounded text-xs">
                  <Text className="text-zinc-400 text-[10px]">{level}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 bg-zinc-800 rounded-full">
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 p-4"
              contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  className={`max-w-[85%] ${msg.type === 'user' ? 'self-end' : 'self-start'}`}
                >
                  <View
                    className={`p-4 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-orange-500 rounded-tr-none'
                        : 'bg-zinc-800 rounded-tl-none border border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-sm ${msg.type === 'user' ? 'text-white' : 'text-zinc-200'}`}
                    >
                      {msg.text}
                    </Text>
                  </View>

                  {/* Workout Preview (Only for AI messages) */}
                  {msg.workoutPlan && (
                    <View className="mt-2 bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
                      {msg.workoutPlan.map((day, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: temporary workout plan days
                        <View key={idx} className="mb-2 last:mb-0">
                          <Text className="text-orange-400 font-bold text-xs mb-1">
                            Treino {day.letter} - {day.focus}
                          </Text>
                          <Text className="text-zinc-500 text-[10px]">
                            {day.exercises
                              .map((e) => e.exerciseName)
                              .join(', ')
                              .substring(0, 100)}
                            ...
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {loading && (
                <View className="self-start p-4 bg-zinc-800 rounded-2xl rounded-tl-none border border-zinc-700">
                  <ActivityIndicator size="small" color="#F97316" />
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View className="p-4 bg-zinc-900 border-t border-zinc-800">
              {currentPlan && (
                <TouchableOpacity
                  onPress={handleImport}
                  className="w-full bg-green-600 py-3 rounded-xl mb-3 flex-row justify-center items-center gap-2"
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-bold">Aprovar e Importar Treino</Text>
                </TouchableOpacity>
              )}

              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-zinc-800 h-10 rounded-full px-4 text-white"
                  placeholder="Ex: Troque o supino por flexão..."
                  placeholderTextColor="#71717A"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    !inputText.trim() ? 'bg-zinc-800' : 'bg-orange-500'
                  }`}
                  disabled={!inputText.trim()}
                >
                  <Ionicons name="send" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
