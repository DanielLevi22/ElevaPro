import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useCores, useEscala } from '@/shared/design';

interface PhaseSummaryCardProps {
  phase: TrainingPlan;
  isStudentView: boolean;
  onPressSplit: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
}

/** O cartão de resumo da fase: divisão, frequência e janela de datas. */
export function PhaseSummaryCard({
  phase,
  isStudentView,
  onPressSplit,
  onPressStart,
  onPressEnd,
}: PhaseSummaryCardProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <LinearGradient
      colors={[cores.card, cores.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-[2rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden"
    >
      <View
        className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full"
        style={{ filter: 'blur(60px)' }}
      />
      <View
        className="absolute -bottom-20 -left-20 w-48 h-48 bg-zinc-500/5 rounded-full"
        style={{ filter: 'blur(50px)' }}
      />

      <View className="flex-row justify-between mb-6">
        <View className="flex-1">
          <Text className="text-zinc-500 text-[0.625rem] font-bold uppercase tracking-widest mb-2">
            Divisão de Treino
          </Text>
          <TouchableOpacity
            activeOpacity={isStudentView ? 1 : 0.7}
            onPress={() => !isStudentView && onPressSplit()}
            className="flex-row items-center bg-white/5 self-start px-4 py-2.5 rounded-2xl border border-white/5"
          >
            <Text className="text-white font-extrabold text-xl mr-2 uppercase">
              {phase.name || '--'}
            </Text>
            {!isStudentView && (
              <Ionicons name="chevron-down" size={escalar(16)} color={cores.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View className="items-end">
          <Text className="text-zinc-500 text-[0.625rem] font-bold uppercase tracking-widest mb-2">
            Frequência
          </Text>
          <View
            className="flex-row items-center bg-orange-500/10 px-4 py-2.5 rounded-2xl border border-orange-500/20"
            style={{ borderColor: `${colors.primary.start}33` }}
          >
            <Ionicons
              name="fitness-outline"
              size={escalar(16)}
              color={colors.primary.start}
              style={{ marginRight: 8 }}
            />
            <Text className="font-extrabold text-lg" style={{ color: colors.primary.start }}>
              —
            </Text>
          </View>
        </View>
      </View>

      <View className="h-[1px] bg-white/5 mb-6" />

      <View className="flex-row justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-zinc-500 text-[0.625rem] font-bold uppercase tracking-widest mb-2">
            Início
          </Text>
          <TouchableOpacity
            activeOpacity={isStudentView ? 1 : 0.7}
            onPress={() => !isStudentView && onPressStart()}
            className="bg-white/5 p-3 rounded-2xl border border-white/5 flex-row items-center justify-between"
          >
            <Text className="text-zinc-300 font-bold text-sm">
              {phase.start_date ? new Date(phase.start_date).toLocaleDateString('pt-BR') : '—'}
            </Text>
            {!isStudentView && (
              <Ionicons name="calendar-outline" size={escalar(14)} color={cores.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-zinc-500 text-[0.625rem] font-bold uppercase tracking-widest mb-2">
            Término
          </Text>
          <TouchableOpacity
            activeOpacity={isStudentView ? 1 : 0.7}
            onPress={() => !isStudentView && onPressEnd()}
            className="bg-white/5 p-3 rounded-2xl border border-white/10 flex-row items-center justify-between"
          >
            <Text className="text-zinc-300 font-bold text-sm">
              {phase.end_date ? new Date(phase.end_date).toLocaleDateString('pt-BR') : '—'}
            </Text>
            {!isStudentView && (
              <Ionicons name="calendar-outline" size={escalar(14)} color={cores.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}
