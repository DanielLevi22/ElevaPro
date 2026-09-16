import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';

/**
 * Os chips de período da evolução em números: 4 semanas, 12, 6 meses e 1 ano.
 *
 *     linha com gap 7; chip de 34 de altura, raio 12, 11 / 700
 *     o ativo pintado na primária; os outros em vidro
 *
 * @example <PeriodChips value={weeks} onChange={setWeeks} />
 */
const PERIODS = [
  { weeks: 4, label: '4 sem' },
  { weeks: 12, label: '12 sem' },
  { weeks: 26, label: '6 meses' },
  { weeks: 52, label: '1 ano' },
] as const;

export type PeriodWeeks = (typeof PERIODS)[number]['weeks'];

interface PeriodChipsProps {
  value: PeriodWeeks;
  onChange: (weeks: PeriodWeeks) => void;
}

export function PeriodChips({ value, onChange }: PeriodChipsProps) {
  return (
    <View className="mt-3.5 flex-row gap-[0.4375rem]" accessibilityRole="tablist">
      {PERIODS.map((period) => {
        const active = period.weeks === value;
        const label = <Chip label={period.label} active={active} />;
        return (
          <TouchableOpacity
            key={period.weeks}
            onPress={() => onChange(period.weeks)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            activeOpacity={0.8}
            className="flex-1"
          >
            {active ? (
              <View className="h-[2.125rem] items-center justify-center rounded-md bg-primary">
                {label}
              </View>
            ) : (
              <Vidro
                classeExterna="rounded-md"
                className="h-[2.125rem] items-center justify-center rounded-md"
              >
                {label}
              </Vidro>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Chip({ label, active }: { label: string; active: boolean }) {
  return (
    <Text
      className={
        active
          ? 'text-[0.6875rem] font-bold text-primary-foreground'
          : 'text-[0.6875rem] font-bold text-muted-foreground'
      }
    >
      {label}
    </Text>
  );
}
