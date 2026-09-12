import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * Pílula de estado, com ponto opcional da mesma cor.
 *
 * Primitiva sem domínio: ela sabe pintar um tom, e não o que "ativo" ou
 * "cancelado" significam. Quem traduz estado do produto em tom é o
 * `StatusBadge`, que fica em cima desta.
 *
 * **Não acrescente `shadow-*` condicional aqui.** Classe de sombra declara uma
 * variável CSS, e o css-interop exige que ela exista já no primeiro render:
 * surgindo depois, ele emite um aviso cuja serialização de props estoura no
 * getter do `NavigationStateContext` e derruba a tela com um erro que fala de
 * navegação. Foi o que quebrava a anamnese ao responder, e o selo de status
 * antigo carregava a cicatriz — `shadow-lg` fixo na base, só a cor mudando.
 * O desenho resolve isso sozinho: brilho é reservado ao primário lime, e selo
 * não tem.
 *
 * @example
 * <Badge tone="success">Ativo</Badge>
 * <Badge tone="neutral" dot={false}>3 séries</Badge>
 */
interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'secondary';
  dot?: boolean;
  children: ReactNode;
}

/** Classe literal por tom: Tailwind só gera o que aparece escrito no fonte. */
const FUNDO = {
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-destructive/15',
  neutral: 'bg-muted',
  primary: 'bg-primary/15',
  secondary: 'bg-secondary/15',
} as const;

const TEXTO = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
  primary: 'text-primary-text',
  secondary: 'text-secondary',
} as const;

const PONTO = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
} as const;

export function Badge({ tone = 'neutral', dot = true, children }: BadgeProps) {
  return (
    <View className={cn('flex-row items-center gap-1.5 rounded-full px-2.5 py-1', FUNDO[tone])}>
      {dot ? <View className={cn('h-1.5 w-1.5 rounded-full', PONTO[tone])} /> : null}
      <Text className={cn('text-micro font-semibold uppercase tracking-wide', TEXTO[tone])}>
        {children}
      </Text>
    </View>
  );
}

export type { BadgeProps };
