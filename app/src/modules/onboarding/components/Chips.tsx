import { View } from 'react-native';
import { ChipMulti } from '@/components/ui/ChipMulti';

/**
 * A fileira de chips de múltipla escolha do kit (`Chips`), quebrando linha.
 *
 * @example <Chips options={['A', 'B']} selected={['A']} onToggle={alternar} />
 */
export function Chips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-[0.4375rem]">
      {options.map((option) => (
        <ChipMulti
          key={option}
          label={option}
          selected={selected.includes(option)}
          onPress={() => onToggle(option)}
        />
      ))}
    </View>
  );
}
