import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useWorkoutLogStore } from '@/workout';

interface Workout {
  id: string;
  title: string;
  description?: string;
}

interface WorkoutExercise {
  id: string;
  sets?: number;
  reps?: number;
  weight?: number;
  rest_seconds?: number;
  notes?: string;
  exercise?: { name: string; muscle_group?: string };
}

export default function StudentWorkoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * Por que a lista veio vazia.
   *
   * Treino sem exercicio e falha de leitura produzem a mesma tela vazia, e o
   * aluno nao tem como distinguir: foi assim que a politica incompleta de
   * `workout_exercises` passou meses parecendo "treino sem exercicios".
   */
  const [erro, setErro] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const { createLog, isWorkoutCompletedToday, fetchLogs } = useWorkoutLogStore();

  const fetchWorkoutDetails = useCallback(async () => {
    setErro(null);
    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();

      if (workoutError) throw workoutError;
      setWorkout(workoutData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('workout_id', id)
        .order('order_index');

      if (itemsError) throw itemsError;
      setExercises(itemsData || []);
    } catch (error) {
      console.error(error);
      setErro('Nao consegui carregar os exercicios deste treino.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      if (id) {
        await fetchWorkoutDetails();
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) {
          await fetchLogs(data.user.id);
        }
      }
    };
    init();
  }, [id, fetchWorkoutDetails, fetchLogs]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    const result = await createLog(id as string, feedback);
    setSubmitting(false);

    if (result.success) {
      setShowFeedbackModal(false);
      setFeedback('');
      Alert.alert('Parabéns! 🎉', 'Treino concluído com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível registrar o check-in.');
    }
  };

  const isCompleted = isWorkoutCompletedToday(id as string);

  if (loading) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </ScreenLayout>
    );
  }

  if (!workout) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#52525B" />
        <Text className="text-foreground text-xl font-bold mt-4 mb-6 font-display">
          Treino não encontrado
        </Text>
        <Button onPress={() => router.back()} variant="outline" label="Voltar" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="px-6 pb-4 pt-2">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-surface p-2.5 rounded-xl mr-4 border border-border"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text
            className="text-2xl font-bold text-foreground flex-1 font-display"
            numberOfLines={1}
          >
            {workout.title}
          </Text>
        </View>

        {workout.description && (
          <View className="bg-surface p-4 rounded-2xl mb-4 border border-border">
            <Text className="text-muted-foreground text-sm font-sans">{workout.description}</Text>
          </View>
        )}

        {isCompleted && (
          <View className="bg-primary/10 p-3 rounded-xl flex-row items-center border border-primary/20">
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#CCFF00"
              style={{ marginRight: 8 }}
            />
            <Text className="text-primary text-sm font-bold font-display">
              Treino concluído hoje!
            </Text>
          </View>
        )}
      </View>

      {/* Exercises List */}
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-lg font-bold text-foreground mb-4 font-display">
          Exercícios ({exercises.length})
        </Text>

        {erro ? (
          <View className="bg-surface p-8 rounded-2xl items-center border-2 border-dashed border-destructive/40">
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color="#52525B"
              style={{ marginBottom: 12 }}
            />
            <Text className="text-muted-foreground text-center font-sans mb-4">{erro}</Text>
            <Button onPress={fetchWorkoutDetails} variant="outline" label="Tentar de novo" />
          </View>
        ) : exercises.length === 0 ? (
          <View className="bg-surface p-8 rounded-2xl items-center border-2 border-dashed border-border">
            <Ionicons
              name="barbell-outline"
              size={48}
              color="#52525B"
              style={{ marginBottom: 12 }}
            />
            <Text className="text-muted-foreground text-center font-sans">
              Nenhum exercício neste treino.
            </Text>
          </View>
        ) : (
          exercises.map((item, index) => (
            <Card key={item.id ?? index} className="mb-3 p-4 border border-border">
              <View className="flex-row items-start mb-3">
                <View className="bg-primary/15 w-8 h-8 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-bold text-sm font-display">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-base font-bold mb-1 font-display">
                    {item.exercise?.name || 'Exercício'}
                  </Text>
                  {item.exercise?.muscle_group && (
                    <View className="bg-secondary/15 self-start px-2 py-1 rounded-md">
                      <Text className="text-secondary text-xs font-bold font-display uppercase">
                        {item.exercise.muscle_group}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="pl-11">
                <View className="flex-row flex-wrap gap-2">
                  {item.sets && (
                    <View className="bg-background px-3 py-2 rounded-lg border border-border flex-1 min-w-[80px]">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">Séries</Text>
                      <Text className="text-foreground text-sm font-bold font-display">
                        {item.sets}
                      </Text>
                    </View>
                  )}
                  {item.reps && (
                    <View className="bg-background px-3 py-2 rounded-lg border border-border flex-1 min-w-[80px]">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">Reps</Text>
                      <Text className="text-foreground text-sm font-bold font-display">
                        {item.reps}
                      </Text>
                    </View>
                  )}
                  {item.weight && (
                    <View className="bg-background px-3 py-2 rounded-lg border border-border flex-1 min-w-[80px]">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">Carga</Text>
                      <Text className="text-foreground text-sm font-bold font-display">
                        {item.weight} kg
                      </Text>
                    </View>
                  )}
                  {item.rest_seconds && (
                    <View className="bg-background px-3 py-2 rounded-lg border border-border flex-1 min-w-[80px]">
                      <Text className="text-muted-foreground text-xs mb-1 font-sans">Descanso</Text>
                      <Text className="text-foreground text-sm font-bold font-display">
                        {item.rest_seconds}s
                      </Text>
                    </View>
                  )}
                </View>

                {item.notes && (
                  <View className="mt-3 p-3 bg-background rounded-lg border border-border">
                    <Text className="text-muted-foreground text-xs italic font-sans">
                      {item.notes}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Check-in Button */}
      {!isCompleted && exercises.length > 0 && (
        <View className="p-6 border-t border-border bg-background/95 absolute bottom-0 left-0 right-0">
          <TouchableOpacity onPress={() => setShowFeedbackModal(true)} activeOpacity={0.8}>
            <LinearGradient
              colors={['#CCFF00', '#99CC00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-xl py-4 items-center justify-center flex-row shadow-lg shadow-primary/20"
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color="#000000"
                style={{ marginRight: 8 }}
              />
              <Text className="text-black text-lg font-bold font-display">Concluir Treino</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-surface rounded-t-3xl p-6 border-t border-border">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-foreground font-display">
                Como foi o treino?
              </Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close" size={28} color="#52525B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Deixe suas observações (opcional)"
              placeholderTextColor="#52525B"
              multiline
              numberOfLines={4}
              className="bg-background rounded-xl p-4 text-foreground text-base h-32 border border-border mb-6 font-sans"
              textAlignVertical="top"
            />

            <TouchableOpacity onPress={handleCheckIn} disabled={submitting} activeOpacity={0.8}>
              <LinearGradient
                colors={['#CCFF00', '#99CC00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-xl py-4 items-center justify-center shadow-lg shadow-primary/20"
              >
                <Text className="text-black text-lg font-bold font-display">
                  {submitting ? 'Salvando...' : 'Confirmar Check-in'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}
