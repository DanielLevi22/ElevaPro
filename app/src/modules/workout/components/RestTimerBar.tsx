import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity, View } from 'react-native';

interface RestTimerBarProps {
  isResting: boolean;
  timer: number;
  currentRestExercise: string;
  onSkipRest: () => void;
  onFinishWorkout: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function RestTimerBar({
  isResting,
  timer,
  currentRestExercise,
  onSkipRest,
  onFinishWorkout,
}: RestTimerBarProps) {
  if (isResting) {
    return (
      <LinearGradient
        colors={['#18181B', '#09090B']}
        className="flex-row items-center justify-between p-6 rounded-[24px] border border-zinc-800"
      >
        <View>
          <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
            Descanso Ativo
          </Text>
          <Text className="text-white font-bold text-sm uppercase" numberOfLines={1}>
            {currentRestExercise}
          </Text>
        </View>
        <View className="flex-row items-center gap-6">
          <Text className="text-4xl font-black text-orange-500 font-display">
            {formatTime(timer)}
          </Text>
          <TouchableOpacity
            onPress={onSkipRest}
            className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700"
          >
            <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity onPress={onFinishWorkout} className="w-full">
      <LinearGradient
        colors={['#FF6B35', '#FF2E63']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl py-5 items-center justify-center shadow-xl shadow-orange-500/20"
      >
        <Text className="text-white text-lg font-black font-display uppercase tracking-widest">
          FINALIZAR TREINO
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
