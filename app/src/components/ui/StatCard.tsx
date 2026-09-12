import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Bloco de métrica: rótulo pequeno, número grande e a variação abaixo.
 *
 * A estrutura é a que já existia em `components/gamification/StatCard` — o
 * próprio design system diz ter sido modelado nela. O que muda é a origem da
 * cor: era hexadecimal da paleta coral em estilo inline, e agora é token.
 *
 * @example
 * <StatCard label="Passos" value="8.412" trend="up" change="84%" icon="footsteps" />
 */
interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const SETA = { up: 'arrow-up', down: 'arrow-down', neutral: 'remove' } as const;
const TEXTO_DA_VARIACAO = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const;
const FUNDO_DA_VARIACAO = {
  up: 'bg-success/10',
  down: 'bg-destructive/10',
  neutral: 'bg-muted',
} as const;

const TAMANHO_DA_SETA = 10;
const TAMANHO_DO_ICONE = 20;

export function StatCard({ label, value, trend, change, icon }: StatCardProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="mb-3 flex-row items-start justify-between rounded-xl border border-border bg-card p-5">
      <View className="flex-1">
        <Text className="mb-1.5 text-micro font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </Text>
        <Text className="mb-1 text-numero font-bold tracking-tight text-foreground">{value}</Text>

        {trend && change ? (
          <View className="flex-row items-center gap-1.5">
            <View className={cn('rounded-full p-0.5', FUNDO_DA_VARIACAO[trend])}>
              <Ionicons
                name={SETA[trend]}
                size={escalar(TAMANHO_DA_SETA)}
                color={corDaVariacao(trend, cores)}
              />
            </View>
            <Text className={cn('text-legenda font-bold', TEXTO_DA_VARIACAO[trend])}>{change}</Text>
          </View>
        ) : null}
      </View>

      {icon ? (
        <View className="rounded-lg border border-border bg-muted p-2.5">
          <Ionicons name={icon} size={escalar(TAMANHO_DO_ICONE)} color={cores.mutedForeground} />
        </View>
      ) : null}
    </View>
  );
}

/** O ícone não aceita classe: a seta precisa da cor já resolvida. */
function corDaVariacao(
  trend: NonNullable<StatCardProps['trend']>,
  cores: ReturnType<typeof useCores>
): string {
  if (trend === 'up') return cores.success;
  if (trend === 'down') return cores.destructive;
  return cores.mutedForeground;
}

export type { StatCardProps };
