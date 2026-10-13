import { Text, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';

import type { ChoiceProps } from './choiceProps';

type ChipPickProps = ChoiceProps;

/**
 * O chip de escolha única do kit (`ChipPick`): os dias por semana, as refeições
 * por dia. Divide a linha com os irmãos em partes iguais; o escolhido é pintado
 * na primária.
 *
 * @example <ChipPick label="4" selected={dias === 4} onPress={() => setDias(4)} />
 */
export function ChipPick({ label, selected, onPress }: ChipPickProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected: selected }}
      accessibilityLabel={label}
      className={cn(
        'h-10 flex-1 items-center justify-center rounded-xl border px-3.5',
        selected ? 'border-primary bg-primary' : 'border-glass-border bg-glass-strong'
      )}
    >
      <Text className={cn('text-sm font-bold', selected ? 'text-primary-foreground' : 'text-hero')}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export type { ChipPickProps };
