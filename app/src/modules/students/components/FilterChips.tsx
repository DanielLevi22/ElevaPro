import { TouchableOpacity, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';

/**
 * A fileira de chips de filtro do kit: o escolhido na primária, os outros em vidro.
 *
 * @example <FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />
 */
interface FilterChipsProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className = 'mt-3',
}: FilterChipsProps<T>) {
  return (
    <View className={`${className} flex-row flex-wrap gap-[0.4375rem]`}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onChange(option.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
        >
          <Chip tom={value === option.value ? 'destaque' : 'neutro'}>{option.label}</Chip>
        </TouchableOpacity>
      ))}
    </View>
  );
}
