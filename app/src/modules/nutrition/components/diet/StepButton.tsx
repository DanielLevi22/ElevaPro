import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * O "−" e o "+" dos ajustes dentro do vidro: meta calórica, percentual de macro,
 * refeições por dia.
 *
 * @example <StepButton direction="up" label="Aumentar a meta" onPress={subir} />
 */
interface StepButtonProps {
  direction: 'up' | 'down';
  label: string;
  onPress: () => void;
}

const ICON_SIZE = 16;

export function StepButton({ direction, label, onPress }: StepButtonProps) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-8 w-8 items-center justify-center rounded-full bg-glass-strong"
    >
      <Ionicons
        name={direction === 'up' ? 'add' : 'remove'}
        size={escalar(ICON_SIZE)}
        color={cores.foreground}
      />
    </TouchableOpacity>
  );
}
