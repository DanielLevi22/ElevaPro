import { TouchableOpacity } from 'react-native';
import { Chip } from '@/components/ui/Chip';

/**
 * O chip do kit, clicável: as preferências da dieta ("Sem lactose", "5
 * refeições"). Aceso no âmbar de aviso, como a restrição do kit; apagado no
 * vidro forte.
 *
 * @example <ToggleChip active={semLactose} onPress={alternar}>Sem lactose</ToggleChip>
 */
interface ToggleChipProps {
  children: string;
  active: boolean;
  onPress: () => void;
}

export function ToggleChip({ children, active, onPress }: ToggleChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={children}
    >
      <Chip tom={active ? 'aviso' : 'neutro'}>{children}</Chip>
    </TouchableOpacity>
  );
}
