import { Ionicons } from '@expo/vector-icons';
import {
  type StyleProp,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;

interface IconButtonProps extends TouchableOpacityProps {
  icon: IconName;
  /**
   * Obrigatório: este botão não tem texto, então sem rótulo o leitor de tela
   * anuncia apenas "botão" — o usuário ouve que existe um controle e não o que
   * ele faz. Descreva a ação ("Excluir treino"), não o ícone ("lixeira").
   */
  accessibilityLabel: string;
  variant?: 'default' | 'danger' | 'ghost' | 'solid' | 'outline';
  size?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  accessibilityLabel,
  variant = 'default',
  size = 24,
  iconColor,
  style,
  ...props
}: IconButtonProps) {
  const getBaseStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.default, // Standard border for shape
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'solid':
        return {
          backgroundColor: colors.primary.start,
          borderColor: colors.primary.start,
        };
      default: // 'default' | 'outline'
        return {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.default,
        };
    }
  };

  const getIconDefaultColor = () => {
    if (iconColor) return iconColor;

    switch (variant) {
      case 'danger':
        return colors.status.error;
      case 'solid':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const baseStyles = getBaseStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="w-10 h-10 items-center justify-center border rounded-full"
      style={[
        {
          backgroundColor: baseStyles.backgroundColor,
          borderColor: baseStyles.borderColor,
          // borderRadius: 20, // Removed to allow rounded-full to take effect
        },
        style,
      ]}
      {...props}
    >
      <Ionicons name={icon} size={20} color={getIconDefaultColor()} />
    </TouchableOpacity>
  );
}
