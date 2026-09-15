import type { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { CaixaDeIcone, type TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';
import type { BaselineComparison } from '../services/dailyComparison';

/**
 * O bloco da Saúde do dia (`Metric` do kit): ícone tingido e rótulo na mesma linha,
 * o número grande e a diferença para a média do próprio Student.
 *
 * A diferença ganha a cor da métrica quando vai na direção boa (mais sono, FC de
 * repouso mais baixa) e fica apagada na outra — sem vermelho: variação não é alarme.
 *
 * @example
 * <HealthMetricCard icon="moon" tone="sono" label="Sono" value="7h12"
 *   comparison={{ average: 398, difference: 34 }} unitOfDifference="min" betterWhen="higher" />
 */
interface HealthMetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone: Extract<TomDeMetrica, 'sono' | 'batimento' | 'passos' | 'calorias'>;
  label: string;
  value: string;
  unit?: string;
  comparison: BaselineComparison | null;
  /** Como a diferença é escrita: "min", "bpm" ou nada, para passos e calorias. */
  unitOfDifference?: string;
  betterWhen: 'higher' | 'lower';
  /** Sem leitura hoje o número é traço, e a linha de baixo diz por quê. */
  hasReading: boolean;
}

export function HealthMetricCard(props: HealthMetricCardProps) {
  const { icon, tone, label, value, unit, hasReading } = props;

  return (
    <Vidro
      classeExterna="flex-1"
      className="p-3.5"
      accessible
      accessibilityLabel={`${label}: ${hasReading ? `${value}${unit ? ` ${unit}` : ''}` : 'sem leitura hoje'}`}
    >
      <View className="flex-row items-center gap-2">
        <CaixaDeIcone icon={icon} tom={tone} tamanho="bloco" />
        <Text className="text-[0.6875rem] font-bold uppercase tracking-wide text-placeholder">
          {label}
        </Text>
      </View>
      <View className="mt-2.5 flex-row items-baseline gap-1">
        <Text className="font-display-black text-[1.5625rem] tracking-tight text-foreground">
          {hasReading ? value : '—'}
        </Text>
        {unit && hasReading ? (
          <Text className="text-[0.71875rem] font-bold text-muted-foreground">{unit}</Text>
        ) : null}
      </View>
      <DifferenceLine {...props} />
    </Vidro>
  );
}

const TONE_TEXT = {
  sono: 'textoSono',
  batimento: 'textoBatimento',
  passos: 'textoPassos',
  calorias: 'textoCalorias',
} as const;

function DifferenceLine({
  tone,
  comparison,
  unitOfDifference,
  betterWhen,
  hasReading,
}: HealthMetricCardProps) {
  const cores = useCores();
  // Some quando não há base, em vez de aparecer zerada: "0 vs. sua média" com dois
  // dias de histórico é um número inventado com cara de medição.
  if (!comparison) {
    return (
      <Text className="mt-[0.1875rem] text-[0.6875rem] text-placeholder">
        {hasReading ? 'sem base ainda' : 'sem leitura hoje'}
      </Text>
    );
  }
  const { difference } = comparison;
  const good = betterWhen === 'higher' ? difference > 0 : difference < 0;
  const sign = difference > 0 ? '+' : difference < 0 ? '−' : '';
  const amount = Math.abs(difference).toLocaleString('pt-BR');
  const text = `${sign}${amount}${unitOfDifference ? ` ${unitOfDifference}` : ''} vs. sua média`;

  return (
    <Text
      className="mt-[0.1875rem] text-[0.6875rem]"
      style={{
        color: good ? cores[TONE_TEXT[tone]] : cores.placeholder,
        fontWeight: good ? '700' : '500',
      }}
    >
      {text}
    </Text>
  );
}
