import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  className?: string;
  variant?: 'default' | 'highlight';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    highlight: 'bg-muted border-primary/20',
  };

  return (
    <View
      className={cn('rounded-xl border p-4 shadow-sm', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </View>
  );
}
