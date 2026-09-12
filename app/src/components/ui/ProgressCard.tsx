import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * Barra de meta diária com a fração ao lado: refeições feitas, treino do dia.
 *
 * @example
 * <ProgressCard title="Meta de Treino" current={1} target={1} unit="treino" color="warning" />
 */
interface ProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  color?: 'success' | 'warning' | 'primary';
}

const BARRA = {
  success: 'bg-success',
  warning: 'bg-warning',
  primary: 'bg-primary',
} as const;

const PORCENTAGEM_CHEIA = 100;

export function ProgressCard({
  title,
  current,
  target,
  unit,
  color = 'primary',
}: ProgressCardProps) {
  const proporcao = fracaoPreenchida(current, target);

  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-rotulo font-semibold tracking-tight text-foreground">{title}</Text>
        <Text className="text-legenda text-muted-foreground">
          {current}/{target}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>

      <View
        // Sem `accessible`, o papel não é anunciado: o leitor de tela trata a
        // barra como um `View` decorativo e a pessoa não ouve o progresso.
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: target, now: current }}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        {/* A largura é dado, e não decisão de estilo: não há classe do Tailwind
            para uma porcentagem que só existe em runtime. */}
        <View
          className={cn('h-full rounded-full', BARRA[color])}
          style={{ width: `${proporcao}%` }}
        />
      </View>
    </View>
  );
}

/**
 * Meta zerada vale como cheia, e não como divisão por zero: "0 de 0 refeições"
 * é uma meta cumprida, não um erro de exibição.
 */
function fracaoPreenchida(current: number, target: number): number {
  if (target <= 0) return PORCENTAGEM_CHEIA;
  return Math.min(PORCENTAGEM_CHEIA, Math.max(0, (current / target) * PORCENTAGEM_CHEIA));
}

export type { ProgressCardProps };
