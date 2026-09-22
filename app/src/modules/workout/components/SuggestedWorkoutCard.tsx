import { Text, View } from 'react-native';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { cn } from '@/lib/utils';
import { useBrilho, useCores } from '@/shared/design';
import { MUSCLE_IMAGES } from '../constants/muscleImages';
import type { Workout } from '../store/workoutStore';

const BRILHO_DO_BOTAO = { y: 10, blur: 26, espalhamento: -8, alfa: 1 } as const;

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
  const brilho = useBrilho();

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
          className={cn(
            'self-start rounded-full border border-white/10 px-3 py-1',
            isDoneToday ? 'bg-muted' : 'bg-glass-strong'
          )}
        >
          <Text
            className={cn(
              'text-[0.625rem] font-bold uppercase tracking-wider',
              isDoneToday ? 'text-muted-foreground' : 'text-white'
            )}
          >
            {isDoneToday ? 'Concluído' : 'Sugerido para hoje'}
          </Text>
        </View>
      }
      icon={isDoneToday ? 'checkmark-circle' : 'flame'}
      iconColor={isDoneToday ? cores.success : cores.foreground}
    >
      {!isDoneToday && (
        <View
          className="mt-4 h-[2.875rem] items-center justify-center rounded-[0.9375rem] bg-primary"
          style={{ boxShadow: brilho(BRILHO_DO_BOTAO, { alfa: BRILHO_DO_BOTAO.alfa }) }}
        >
          <Text className="text-[0.84375rem] font-extrabold uppercase tracking-widest text-primary-foreground">
            Começar treino
          </Text>
        </View>
      )}
    </PremiumCard>
  );
}
