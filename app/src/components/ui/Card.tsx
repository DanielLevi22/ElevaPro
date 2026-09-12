import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * Superfície de conteúdo: fundo de grupo, fio de 1px e canto de 16.
 *
 * Sem sombra em repouso, como o design pede — a separação vem da borda, e o
 * brilho fica reservado ao primário lime. A sombra que estava aqui vinha da
 * paleta anterior e não existe no desenho.
 *
 * Para lista de linhas separadas por fio, o componente é o `Group`, não este.
 *
 * @example
 * <Card className="p-4"><Text>...</Text></Card>
 */
interface CardProps extends ViewProps {
  className?: string;
  variant?: 'default' | 'highlight';
}

const VARIANTE = {
  default: 'bg-card border-border',
  highlight: 'bg-card border-primary/30',
} as const;

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <View className={cn('rounded-lg border p-4', VARIANTE[variant], className)} {...props}>
      {children}
    </View>
  );
}

export type { CardProps };
