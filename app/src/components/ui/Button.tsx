import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import colors from '@/constants/colors';
import { cn } from '@/lib/utils';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  icon,
}: ButtonProps) {
  const baseStyles = 'rounded-xl flex-row items-center justify-center overflow-hidden';

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3.5',
    lg: 'px-8 py-4',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const disabledStyles = disabled || isLoading ? 'opacity-50' : '';

  // Gradient variants
  const useGradient = variant === 'primary' || variant === 'secondary';
  const gradientColors =
    variant === 'primary'
      ? colors.gradients.primary
      : variant === 'secondary'
        ? colors.gradients.secondary
        : ['transparent', 'transparent'];

  // Non-gradient variant styles
  const solidVariantStyles = {
    outline: 'border-2 border-primary bg-transparent active:bg-primary/10',
    ghost: 'bg-transparent active:bg-zinc-800/50',
    destructive: 'bg-red-500 active:bg-red-600',
  };

  const textColor =
    variant === 'primary' || variant === 'secondary' || variant === 'destructive'
      ? 'text-black'
      : variant === 'outline'
        ? 'text-primary'
        : 'text-foreground';

  const ButtonContent = () => (
    <>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary.solid : '#000000'}
        />
      ) : (
        <View className="flex-row items-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={cn('font-bold font-display', textSizeStyles[size], textColor)}>
            {label}
          </Text>
        </View>
      )}
    </>
  );

  if (useGradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || isLoading}
        // O rótulo acessível sai do `label` que o botão já exibe: não há por que
        // pedir a mesma informação duas vezes ao call site. `busy` faz o leitor
        // anunciar o carregamento em vez de ler um botão que não responde.
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
        className={cn(baseStyles, sizeStyles[size], disabledStyles, className)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors as LinearGradientProps['colors']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute inset-0"
        />
        <View className="z-10">
          <ButtonContent />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      className={cn(
        baseStyles,
        solidVariantStyles[variant],
        sizeStyles[size],
        disabledStyles,
        className
      )}
    >
      <ButtonContent />
    </TouchableOpacity>
  );
}
