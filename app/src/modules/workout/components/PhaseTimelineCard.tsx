import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useCores, useEscala } from '@/shared/design';

interface PhaseTimelineCardProps {
  phase: TrainingPlan;
  index: number;
  isLast: boolean;
  onPress: () => void;
}

const RÓTULO_DO_STATUS: Record<string, string> = {
  active: 'ATIVO',
  completed: 'CONCLUÍDO',
  planned: 'RASCUNHO',
};

/** Uma fase na linha do tempo da periodização: marcador, cartão e datas. */
export function PhaseTimelineCard({ phase, index, isLast, onPress }: PhaseTimelineCardProps) {
  const cores = useCores();
  const escalar = useEscala();
  const phaseIsActive = phase.status === 'active';
  const phaseIsCompleted = phase.status === 'completed';

  return (
    <View className="flex-row">
      {/* Timeline Tracker */}
      <View className="items-center mr-4">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
            phaseIsActive ? 'bg-orange-500 border-orange-400' : 'bg-zinc-900 border-zinc-800'
          }`}
          style={
            phaseIsActive
              ? { backgroundColor: colors.primary.start, borderColor: colors.primary.light }
              : {}
          }
        >
          {phaseIsCompleted ? (
            <Ionicons name="checkmark" size={escalar(16)} color={cores.primaryForeground} />
          ) : (
            <Text className={`text-xs font-bold ${phaseIsActive ? 'text-white' : 'text-zinc-500'}`}>
              {index + 1}
            </Text>
          )}
        </View>
        {!isLast && <View className="w-[0.125rem] flex-1 bg-zinc-800 my-2" />}
      </View>

      {/* Phase Card */}
      <TouchableOpacity
        className={`flex-1 mb-8 rounded-2xl overflow-hidden border ${
          phaseIsActive ? 'bg-zinc-900' : 'bg-zinc-900/50'
        }`}
        style={{
          borderColor: phaseIsActive ? colors.primary.start : colors.border.dark,
          shadowColor: colors.primary.start,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: phaseIsActive ? 0.1 : 0,
          shadowRadius: 20,
          elevation: phaseIsActive ? 5 : 0,
        }}
        onPress={onPress}
      >
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text
                className={`text-lg font-bold font-display ${phaseIsActive ? 'text-white' : 'text-zinc-400'}`}
              >
                {phase.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons
                  name="barbell-outline"
                  size={escalar(12)}
                  color={phaseIsActive ? colors.primary.start : colors.text.muted}
                />
                <Text
                  className="text-zinc-500 text-[0.625rem] font-bold ml-1 uppercase"
                  style={{ color: colors.text.muted }}
                >
                  {phase.name}
                </Text>
              </View>
            </View>

            <View
              className={`px-2 py-1 rounded-lg ${
                phaseIsActive
                  ? 'bg-orange-500/10'
                  : phaseIsCompleted
                    ? 'bg-emerald-500/10'
                    : 'bg-zinc-800'
              }`}
            >
              <Text
                className={`text-[0.5625rem] font-bold uppercase tracking-wider ${
                  phaseIsActive
                    ? 'text-orange-500'
                    : phaseIsCompleted
                      ? 'text-emerald-500'
                      : 'text-zinc-500'
                }`}
                style={
                  phaseIsActive
                    ? { color: colors.primary.start }
                    : phaseIsCompleted
                      ? { color: cores.success }
                      : {}
                }
              >
                {RÓTULO_DO_STATUS[phase.status] ?? phase.status}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center border-t border-zinc-800/50 pt-3 mt-1">
            <View className="flex-row items-center bg-zinc-800/40 px-2.5 py-1.5 rounded-lg border border-white/5">
              <Ionicons name="time-outline" size={escalar(12)} color={colors.text.muted} />
              <Text
                className="text-zinc-400 text-[0.625rem] font-bold ml-2"
                style={{ color: colors.text.secondary }}
              >
                {phase.start_date
                  ? new Date(phase.start_date).toLocaleDateString('pt-BR', { month: 'short' })
                  : '—'}{' '}
                -{' '}
                {phase.end_date
                  ? new Date(phase.end_date).toLocaleDateString('pt-BR', { month: 'short' })
                  : '—'}
              </Text>
            </View>

            <View className="flex-1" />

            <View className="flex-row items-center">
              <Text
                className="text-orange-500 text-[0.625rem] font-bold mr-1"
                style={{ color: colors.primary.start }}
              >
                ACESSAR
              </Text>
              <Ionicons name="chevron-forward" size={escalar(12)} color={colors.primary.start} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
