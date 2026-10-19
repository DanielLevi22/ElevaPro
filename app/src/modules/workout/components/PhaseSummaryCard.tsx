import type { TrainingPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { DatePickerField } from './DatePickerField';

interface PhaseSummaryCardProps {
  phase: TrainingPlan;
  /** As letras das fichas da fase, na ordem — "ABC". Vazio antes da primeira. */
  split: string;
  isStudentView: boolean;
  onPressSplit: () => void;
  onChangeDate: (field: 'start_date' | 'end_date', value: string) => void;
}

const ROTULO = 'mb-2 text-[0.625rem] font-bold uppercase tracking-widest text-placeholder';

/** O cartão de resumo da fase: a divisão e a janela de datas, as duas editáveis. */
export function PhaseSummaryCard({
  phase,
  split,
  isStudentView,
  onPressSplit,
  onChangeDate,
}: PhaseSummaryCardProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro className="p-5">
      <Text className={ROTULO}>Divisão de treino</Text>
      <TouchableOpacity
        disabled={isStudentView}
        onPress={onPressSplit}
        accessibilityRole="button"
        accessibilityLabel={`Divisão de treino: ${split || 'nenhuma'}`}
        className="flex-row items-center self-start rounded-md bg-glass-strong px-3.5 py-2.5"
      >
        <Text className="mr-1.5 text-[1.125rem] font-extrabold uppercase text-foreground">
          {split || '--'}
        </Text>
        {!isStudentView && (
          <Ionicons name="chevron-down" size={escalar(16)} color={cores.primary} />
        )}
      </TouchableOpacity>

      <View className="my-5 h-[0.5px] bg-glass-border" />

      <View className="flex-row gap-3">
        <DatePickerField
          label="Início"
          value={phase.start_date}
          editable={!isStudentView}
          onChange={(value) => onChangeDate('start_date', value)}
        />
        <DatePickerField
          label="Término"
          value={phase.end_date}
          minimumDate={phase.start_date}
          editable={!isStudentView}
          onChange={(value) => onChangeDate('end_date', value)}
        />
      </View>
    </Vidro>
  );
}
