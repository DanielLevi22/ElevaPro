import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';

/**
 * Os sete dias da dieta cíclica, de segunda a domingo. É dia da semana, não
 * data: o plano se repete toda semana, e o número do dia confundiria.
 *
 * @example <WeekdayStrip value={dia} onChange={setDia} />
 */
interface WeekdayStripProps {
  /** Domingo = 0, como `day_of_week`. */
  value: number;
  onChange: (day: number) => void;
}

// Segunda primeiro, como a faixa do aluno.
const DAYS = [
  { day: 1, initial: 'S', label: 'segunda' },
  { day: 2, initial: 'T', label: 'terça' },
  { day: 3, initial: 'Q', label: 'quarta' },
  { day: 4, initial: 'Q', label: 'quinta' },
  { day: 5, initial: 'S', label: 'sexta' },
  { day: 6, initial: 'S', label: 'sábado' },
  { day: 0, initial: 'D', label: 'domingo' },
];

export function WeekdayStrip({ value, onChange }: WeekdayStripProps) {
  return (
    <View className="mt-3 flex-row gap-1.5">
      {DAYS.map(({ day, initial, label }) => (
        <TouchableOpacity
          key={day}
          onPress={() => onChange(day)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: day === value }}
          className="flex-1"
        >
          <Vidro
            classeExterna="rounded-[0.875rem]"
            className={cn(
              'items-center rounded-[0.875rem] py-[0.5625rem]',
              day === value ? 'border-primary/50 bg-primary' : null
            )}
          >
            <Text
              className={cn(
                'text-[0.75rem] font-extrabold',
                day === value ? 'text-primary-foreground' : 'text-placeholder'
              )}
            >
              {initial}
            </Text>
          </Vidro>
        </TouchableOpacity>
      ))}
    </View>
  );
}
