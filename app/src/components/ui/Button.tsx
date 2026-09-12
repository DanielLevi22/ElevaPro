import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * Botão de ação, no desenho do app.
 *
 * O vocabulário de variante vem do design system, que o web também usa. A
 * aparência vem das telas do mobile, que são iOS: preenchimento chapado, canto
 * de 14 e altura de 50 — e não a pílula com brilho do dashboard. Fidelidade é
 * às telas desenhadas.
 *
 * Duas diferenças em relação ao vocabulário do web, ambas vindas do desenho:
 * `tinted` existe (é o botão neutro preenchido do iOS, que o kit usa para
 * "Voltar" e para a entrada secundária) e `primary`/`secondary` não têm mais
 * gradiente.
 *
 * @example
 * <Button label="Entrar" onPress={entrar} fullWidth />
 * <Button label="Voltar" onPress={voltar} variant="tinted" />
 */
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tinted' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

/** Classe literal por variante: Tailwind só gera o que aparece escrito no fonte. */
const FUNDO = {
  primary: 'bg-primary active:opacity-80',
  secondary: 'bg-secondary active:opacity-80',
  tinted: 'bg-muted active:opacity-80',
  outline: 'bg-transparent border border-primary active:opacity-80',
  ghost: 'bg-transparent active:opacity-80',
  destructive: 'bg-destructive active:opacity-80',
} as const;

const TEXTO = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  tinted: 'text-foreground',
  outline: 'text-primary-text',
  ghost: 'text-secondary',
  destructive: 'text-destructive-foreground',
} as const;

const ALTURA = {
  sm: 'h-9 rounded-xl',
  md: 'h-[3.125rem] rounded-2xl',
  lg: 'h-14 rounded-2xl',
} as const;
const TAMANHO_DO_TEXTO = { sm: 'text-legenda', md: 'text-corpo', lg: 'text-corpo' } as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  className,
  icon,
}: ButtonProps) {
  const cores = useCores();
  const inativo = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inativo}
      activeOpacity={0.8}
      // O rótulo acessível sai do `label` que o botão já exibe: não há por que
      // pedir a mesma informação duas vezes ao call site. `busy` faz o leitor
      // anunciar o carregamento em vez de ler um botão que não responde.
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inativo, busy: isLoading }}
      className={cn(
        'flex-row items-center justify-center gap-2 px-5',
        ALTURA[size],
        FUNDO[variant],
        fullWidth && 'w-full',
        // 0.45 é o valor do desenho, e não o 0.5 que estava aqui antes.
        inativo && 'opacity-45',
        className
      )}
    >
      {isLoading ? (
        <ActivityIndicator color={corDoTexto(variant, cores)} />
      ) : (
        <>
          {icon}
          <Text
            className={cn('font-semibold tracking-tight', TAMANHO_DO_TEXTO[size], TEXTO[variant])}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/** O `ActivityIndicator` não aceita classe: precisa da cor já resolvida. */
function corDoTexto(variant: keyof typeof TEXTO, cores: ReturnType<typeof useCores>): string {
  if (variant === 'primary') return cores.primaryForeground;
  if (variant === 'secondary') return cores.secondaryForeground;
  if (variant === 'destructive') return cores.destructiveForeground;
  if (variant === 'outline') return cores.primaryText;
  if (variant === 'ghost') return cores.secondary;
  return cores.foreground;
}

export type { ButtonProps };
