import { Text, View } from 'react-native';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useCores } from '@/shared/design';
import { MUSCLE_IMAGES } from '../constants/muscleImages';
import type { Workout } from '../store/workoutStore';

interface SuggestedWorkoutCardProps {
  workout: Workout;
  isDoneToday: boolean;
  onPress: () => void;
}

/**
 * O treino sugerido pra hoje, no topo da fase — `PremiumCard` já é pressável
 * sozinho, então não precisa de outro `TouchableOpacity` por fora.
 */
export function SuggestedWorkoutCard({ workout, isDoneToday, onPress }: SuggestedWorkoutCardProps) {
  const cores = useCores();

  return (
    <PremiumCard
      title={isDoneToday ? 'Treino Finalizado' : workout.title}
      subtitle={
        isDoneToday
          ? `Bom descanso! O próximo treino será: ${workout.title}`
          : `${workout.exercises?.length || 0} exercícios • ~60 min`
      }
      image={
        isDoneToday
          ? undefined
          : MUSCLE_IMAGES[workout.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral
      }
      onPress={onPress}
      containerStyle={isDoneToday ? { opacity: 0.8, marginBottom: 32 } : { marginBottom: 32 }}
      badge={
        <View
          className={`${isDoneToday ? 'bg-zinc-800' : 'bg-black/40'} px-3 py-1 rounded-full border border-white/10 self-start`}
        >
          <Text
            className={`${isDoneToday ? 'text-zinc-400' : 'text-white'} font-bold text-[0.625rem] uppercase tracking-wider`}
          >
            {isDoneToday ? 'Concluído' : 'Sugerido para hoje'}
          </Text>
        </View>
      }
      icon={isDoneToday ? 'checkmark-circle' : 'flame'}
      iconColor={isDoneToday ? cores.success : cores.foreground}
    >
      {!isDoneToday && (
        <View className="mt-4 bg-orange-500 py-3 rounded-2xl items-center shadow-lg shadow-orange-500/40">
          <Text className="text-white font-bold text-base uppercase tracking-widest">
            Começar Treino
          </Text>
        </View>
      )}
    </PremiumCard>
  );
}
