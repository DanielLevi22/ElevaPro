import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

interface PhaseSummaryCardProps {
  phase: TrainingPlan;
  isStudentView: boolean;
  onPressSplit: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
}

const ROTULO = 'mb-2 text-[0.625rem] font-bold uppercase tracking-widest text-placeholder';

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
    <Vidro className="p-5">
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className={ROTULO}>Divisão de treino</Text>
          <TouchableOpacity
            activeOpacity={isStudentView ? 1 : 0.7}
            onPress={() => !isStudentView && onPressSplit()}
            className="flex-row items-center self-start rounded-md bg-glass-strong px-3.5 py-2.5"
          >
            <Text className="mr-1.5 text-[1.125rem] font-extrabold uppercase text-foreground">
              {phase.name || '--'}
            </Text>
            {!isStudentView && (
              <Ionicons name="chevron-down" size={escalar(16)} color={cores.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View className="items-end">
          <Text className={ROTULO}>Frequência</Text>
          <View className="flex-row items-center gap-1.5 rounded-md bg-primary/15 px-3.5 py-2.5">
            <Ionicons name="fitness-outline" size={escalar(16)} color={cores.primaryText} />
            <Text className="text-[1.0625rem] font-extrabold text-primary-text">—</Text>
          </View>
        </View>
      </View>

      <View className="my-5 h-[0.5px] bg-glass-border" />

      <View className="flex-row gap-3">
        <CampoDeData
          rotulo="Início"
          data={phase.start_date}
          editavel={!isStudentView}
          onPress={onPressStart}
        />
        <CampoDeData
          rotulo="Término"
          data={phase.end_date}
          editavel={!isStudentView}
          onPress={onPressEnd}
        />
      </View>
    </Vidro>
  );
}

function CampoDeData({
  rotulo,
  data,
  editavel,
  onPress,
}: {
  rotulo: string;
  data: string | null;
  editavel: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-1">
      <Text className={ROTULO}>{rotulo}</Text>
      <TouchableOpacity
        activeOpacity={editavel ? 0.7 : 1}
        onPress={() => editavel && onPress()}
        className="flex-row items-center justify-between rounded-md bg-glass-strong p-3"
      >
        <Text className="text-[0.84375rem] font-bold text-foreground">
          {data ? new Date(data).toLocaleDateString('pt-BR') : '—'}
        </Text>
        {editavel ? (
          <Ionicons name="calendar-outline" size={escalar(14)} color={cores.mutedForeground} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
