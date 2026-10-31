import { localNoonOf } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { localDateKey } from '@/services/healthSync';
import { useCores, useEscala } from '@/shared/design';
import { FieldLabel } from './FieldLabel';

interface DatePickerFieldProps {
  label: string;
  /** `YYYY-MM-DD`, como o banco guarda. */
  value: string | null;
  onChange: (value: string) => void;
  /** A data de término não pode ser antes da de início. */
  minimumDate?: string | null;
  editable?: boolean;
}

/**
 * Uma data de período — início ou término —, que abre o calendário ao toque.
 *
 * Lê e grava `YYYY-MM-DD` ao meio-dia local (`localNoonOf`), para o calendário
 * nunca mostrar o dia anterior no fuso do Brasil.
 *
 * @example
 * <DatePickerField label="Início" value={startDate} onChange={setStartDate} />
 */
export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  editable = true,
}: DatePickerFieldProps) {
  const cores = useCores();
  const escalar = useEscala();
  const [open, setOpen] = useState(false);
  const shown = value ? localNoonOf(value).toLocaleDateString('pt-BR') : '—';

  return (
    <View className="flex-1">
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        disabled={!editable}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        className="flex-row items-center justify-between rounded-md bg-glass-strong p-3"
      >
        <Text className="text-[0.84375rem] font-bold text-foreground">{shown}</Text>
        {editable ? (
          <Ionicons name="calendar-outline" size={escalar(14)} color={cores.mutedForeground} />
        ) : null}
      </TouchableOpacity>
      {open ? (
        <DateTimePicker
          value={value ? localNoonOf(value) : new Date()}
          mode="date"
          minimumDate={minimumDate ? localNoonOf(minimumDate) : undefined}
          onChange={(_, picked) => {
            setOpen(false);
            if (picked) onChange(localDateKey(picked));
          }}
        />
      ) : null}
    </View>
  );
}
