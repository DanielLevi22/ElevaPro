import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

interface ChipMultiProps {
  rotulo: string;
  marcado: boolean;
  onPress: () => void;
}

const ICONE_DO_TIQUE = 12;

/**
 * O chip de múltipla escolha do kit (`ChipMulti`): pílula de vidro que, marcada,
 * ganha o tique num círculo da primária e a borda da primária.
 *
 * @example <ChipMulti rotulo="Lactose" marcado={excluidos.includes('lactose')} onPress={() => alternar('lactose')} />
 */
export function ChipMulti({ rotulo, marcado, onPress }: ChipMultiProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      accessibilityLabel={rotulo}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-full border',
        marcado
          ? 'border-primary bg-primary/15 pl-[0.5625rem] pr-[0.8125rem]'
          : 'border-glass-border bg-glass-strong px-[0.8125rem]'
      )}
    >
      {marcado ? (
        <View className="h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-primary">
          <Ionicons
            name="checkmark"
            size={escalar(ICONE_DO_TIQUE)}
            color={cores.primaryForeground}
          />
        </View>
      ) : null}
      <Text className="text-[0.78125rem] font-semibold text-hero">{rotulo}</Text>
    </TouchableOpacity>
  );
}

export type { ChipMultiProps };
