import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

interface PhaseTimelineCardProps {
  phase: TrainingPlan;
  index: number;
  isLast: boolean;
  onPress: () => void;
}

/** Uma fase na linha do tempo da periodização: marcador, cartão de vidro e datas. */
export function PhaseTimelineCard({ phase, index, isLast, onPress }: PhaseTimelineCardProps) {
  const cores = useCores();
  const escalar = useEscala();
  const ativa = phase.status === 'active';
  const concluida = phase.status === 'completed';

  return (
    <View className="flex-row">
      <View className="mr-3.5 items-center">
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-full border-2',
            ativa ? 'border-primary bg-primary' : 'border-glass-border bg-glass-strong'
          )}
        >
          {concluida ? (
            <Ionicons name="checkmark" size={escalar(16)} color={cores.mutedForeground} />
          ) : (
            <Text
              className={cn(
                'text-[0.75rem] font-bold',
                ativa ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {index + 1}
            </Text>
          )}
        </View>
        {!isLast && <View className="my-2 w-[0.125rem] flex-1 bg-glass-border" />}
      </View>

      <TouchableOpacity onPress={onPress} className="mb-4 flex-1" accessibilityRole="button">
        <Vidro destaque={ativa} className="p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <Text className="flex-1 text-[1.0625rem] font-bold tracking-tight text-foreground">
              {phase.name}
            </Text>
            <StatusBadge status={phase.status} showDot={false} />
          </View>

          <View className="flex-row items-center border-t border-glass-border pt-3">
            <View className="flex-row items-center gap-1.5 rounded-md bg-glass-strong px-2.5 py-1.5">
              <Ionicons name="time-outline" size={escalar(12)} color={cores.mutedForeground} />
              <Text className="text-legenda font-bold text-muted-foreground">
                {formatoCurto(phase.start_date)} - {formatoCurto(phase.end_date)}
              </Text>
            </View>

            <View className="flex-1" />

            <View className="flex-row items-center gap-0.5">
              <Text className="text-legenda font-bold text-primary-text">Acessar</Text>
              <Ionicons name="chevron-forward" size={escalar(12)} color={cores.primaryText} />
            </View>
          </View>
        </Vidro>
      </TouchableOpacity>
    </View>
  );
}

function formatoCurto(data: string | null): string {
  return data ? new Date(data).toLocaleDateString('pt-BR', { month: 'short' }) : '—';
}
