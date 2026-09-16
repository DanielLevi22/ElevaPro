import type { Ionicons as IoniconsType } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { type ChartTone, toneColors } from '@/components/ui/charts/tones';
import { Vidro } from '@/components/ui/Vidro';
import { comOpacidade, useCores, useEscala } from '@/shared/design';
import { Sparkline } from './charts/Sparkline';

/**
 * O cartão de número do kit de métricas (`Stat`): ícone tingido, valor, rótulo,
 * a linha das últimas semanas e a variação.
 *
 *     glass, padding 14; ícone 28 × 28, raio 9, cor a 18%; valor 21 / 800; rótulo 11
 *
 * Não é o `BlocoDeMetrica` da tela inicial: aquele não tem série nem variação, e o
 * ícone é maior. Aqui são três cartões na fila e mais estreitos.
 *
 * @example
 * <TrendStat icon="barbell" tone="brand" label="Treinos" value="34"
 *   spark={summary.workouts.spark} delta={<TrendDelta value={4} unit="mês" judgement="good" />} />
 */
interface TrendStatProps {
  icon: keyof typeof IoniconsType.glyphMap;
  tone: ChartTone;
  label: string;
  value: string;
  unit?: string;
  spark?: readonly (number | null)[];
  delta?: ReactNode;
}

const ICON_SIZE = 14;
const ICON_BACKGROUND_ALPHA = 0.18;

export function TrendStat({ icon, tone, label, value, unit, spark, delta }: TrendStatProps) {
  const cores = useCores();
  const escalar = useEscala();
  const colors = toneColors(cores, tone);

  return (
    <Vidro classeExterna="min-w-0 flex-1" className="flex-1 p-3.5">
      <View
        className="mb-2.5 h-7 w-7 items-center justify-center rounded-[0.5625rem]"
        style={{ backgroundColor: comOpacidade(colors.fill, ICON_BACKGROUND_ALPHA) }}
      >
        <Ionicons name={icon} size={escalar(ICON_SIZE)} color={colors.text} />
      </View>
      <View className="flex-row items-baseline gap-[0.1875rem]">
        <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
          {value}
        </Text>
        {unit ? (
          <Text className="text-[0.65625rem] font-bold text-muted-foreground">{unit}</Text>
        ) : null}
      </View>
      <Text numberOfLines={1} className="mt-0.5 text-[0.6875rem] text-muted-foreground">
        {label}
      </Text>
      {spark ? <Sparkline values={spark} color={colors.fill} /> : null}
      {delta ? <View className="mt-[0.4375rem]">{delta}</View> : null}
    </Vidro>
  );
}
