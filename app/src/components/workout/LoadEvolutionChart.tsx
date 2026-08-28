import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { WorkoutAnalyticsService } from './WorkoutAnalyticsService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80; // Full width inside card
const CHART_HEIGHT = 180;

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface DataPoint {
  date: string;
  weight: number;
  rawDate: string;
}

export const LoadEvolutionChart = ({ studentId }: { studentId: string }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const loadExercises = useCallback(async () => {
    const data = await WorkoutAnalyticsService.getExercisesWithHistory(studentId);
    setExercises(data);
    if (data.length > 0) {
      // Default to the first one (usually most recent due to fetch logic, or alphabetical)
      // Let's pick 'Supino' or 'Agachamento' if available, else first
      const preferred = data.find(
        (e) =>
          e.name.toLowerCase().includes('supino') || e.name.toLowerCase().includes('agachamento')
      );
      setSelectedExercise(preferred || data[0]);
    }
  }, [studentId]);

  const loadHistory = useCallback(
    async (exerciseId: string) => {
      setIsLoading(true);
      const data = await WorkoutAnalyticsService.getExerciseHistory(studentId, exerciseId);
      setHistory(data);
      setIsLoading(false);
    },
    [studentId]
  );

  // Fetch available exercises on mount
  useEffect(() => {
    if (studentId) {
      loadExercises();
    }
  }, [studentId, loadExercises]);

  // Fetch history when exercise changes
  useEffect(() => {
    if (selectedExercise && studentId) {
      loadHistory(selectedExercise.id);
    }
  }, [selectedExercise, studentId, loadHistory]);

  const renderChart = () => {
    if (history.length < 2) {
      return (
        <View className="h-[180px] justify-center items-center">
          <Text className="text-zinc-500 text-sm">Dados insuficientes para gerar gráfico</Text>
        </View>
      );
    }

    const weights = history.map((h) => h.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights) * 0.9; // Buffer
    const range = maxWeight - minWeight || 10; // Avoid divide by zero

    const points = history.map((point, i) => {
      const x = (i / (history.length - 1)) * (CHART_WIDTH - 20) + 10;
      const y = CHART_HEIGHT - ((point.weight - minWeight) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    });

    const dLine = `M ${points.join(' L ')}`;
    const dArea = `${dLine} L ${CHART_WIDTH - 10},${CHART_HEIGHT} L 10,${CHART_HEIGHT} Z`;

    const progress = weights[weights.length - 1] - weights[0];
    const isPositive = progress >= 0;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <title>Gráfico de Evolução de Carga</title>
          <Defs>
            <LinearGradient id="evoGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={isPositive ? '#34D399' : '#F87171'} stopOpacity="0.3" />
              <Stop offset="1" stopColor={isPositive ? '#34D399' : '#F87171'} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          <Path d={dArea} fill="url(#evoGradient)" />
          <Path
            d={dLine}
            fill="none"
            stroke={isPositive ? '#34D399' : '#F87171'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => {
            const [cx, cy] = p.split(',');
            return (
              <Circle
                key={history[i].rawDate || i}
                cx={cx}
                cy={cy}
                r="4"
                fill="#18181B"
                stroke={isPositive ? '#34D399' : '#F87171'}
                strokeWidth="2"
              />
            );
          })}
        </Svg>

        <View className="flex-row justify-between mt-2">
          <Text className="text-zinc-500 text-[10px]">{history[0].date}</Text>
          <Text className="text-zinc-500 text-[10px]">{history[history.length - 1].date}</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-white text-sm font-bold leading-tight uppercase tracking-wider text-zinc-400">
            Evolução de Cargas
          </Text>
          <Text className="text-xs text-zinc-500 mt-1">Progresso de carga máxima por sessão</Text>
        </View>

        {/* Exercise Selector Button */}
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          className="flex-row items-center bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700"
        >
          <Text className="text-white font-bold text-xs mr-2 max-w-[100px]" numberOfLines={1}>
            {selectedExercise?.name || 'Selecionar'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View className="h-[180px] justify-center items-center">
          <ActivityIndicator color="#FF6B35" />
        </View>
      ) : selectedExercise ? (
        <Animated.View entering={FadeInDown}>
          <View className="flex-row items-end mb-4 gap-2">
            <Text className="text-3xl font-black text-white font-display">
              {history.length > 0 ? `${Math.max(...history.map((h) => h.weight))}kg` : '-'}
            </Text>
            <Text className="text-sm text-zinc-500 font-bold mb-1.5">Recorde Pessoal (PR)</Text>
            {history.length > 1 && (
              <View className="bg-zinc-800 px-2 py-1 rounded-md mb-1 ml-auto">
                <Text className="text-emerald-400 text-xs font-bold">
                  Total: +{history[history.length - 1].weight - history[0].weight}kg
                </Text>
              </View>
            )}
          </View>
          {renderChart()}
        </Animated.View>
      ) : (
        <View className="h-[180px] justify-center items-center">
          <Text className="text-zinc-500">Nenhum exercício selecionado</Text>
        </View>
      )}

      {/* Exercise Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View className="flex-1 bg-black/80 justify-center p-6">
          <View className="bg-zinc-900 rounded-3xl border border-zinc-800 max-h-[70%] overflow-hidden">
            <View className="p-4 border-b border-zinc-800 flex-row justify-between items-center">
              <Text className="text-white font-bold text-lg">Selecionar Exercício</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {exercises.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => {
                    setSelectedExercise(ex);
                    setShowPicker(false);
                  }}
                  className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedExercise?.id === ex.id ? 'bg-orange-500/20 border border-orange-500' : 'bg-zinc-800/50'}`}
                >
                  <Text
                    className={`font-bold ${selectedExercise?.id === ex.id ? 'text-orange-500' : 'text-zinc-300'}`}
                  >
                    {ex.name}
                  </Text>
                  {selectedExercise?.id === ex.id && (
                    <Ionicons name="checkmark" size={20} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              ))}
              {exercises.length === 0 && (
                <Text className="text-zinc-500 text-center py-8">Nenhum histórico encontrado.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
