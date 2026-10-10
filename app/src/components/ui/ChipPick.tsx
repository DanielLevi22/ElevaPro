import { Text, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';

interface ChipPickProps {
  rotulo: string;
  marcado: boolean;
  onPress: () => void;
}

/**
 * O chip de escolha única do kit (`ChipPick`): os dias por semana, as refeições
 * por dia. Divide a linha com os irmãos em partes iguais; o escolhido é pintado
 * na primária.
 *
 * @example <ChipPick rotulo="4" marcado={dias === 4} onPress={() => setDias(4)} />
 */
export function ChipPick({ rotulo, marcado, onPress }: ChipPickProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected: marcado }}
      accessibilityLabel={rotulo}
      className={cn(
        'h-10 flex-1 items-center justify-center rounded-xl border px-3.5',
        marcado ? 'border-primary bg-primary' : 'border-glass-border bg-glass-strong'
      )}
    >
      <Text className={cn('text-sm font-bold', marcado ? 'text-primary-foreground' : 'text-hero')}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  );
}

export type { ChipPickProps };
