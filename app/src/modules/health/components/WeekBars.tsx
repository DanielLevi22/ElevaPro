import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { comOpacidade } from '@/shared/design';
import type { WeekBar } from '../services/dailyComparison';

/**
 * As barras de 7 dias do kit (`Bars`): o valor em cima, a inicial do dia embaixo, e
 * hoje na cor cheia com os outros dias a 40%.
 *
 * Altura relativa ao maior valor da semana, e não a uma escala fixa. Dia sem leitura
 * vira tracinho apagado, e não barra de altura zero: zero no mesmo tom lê como
 * "dormiu nada".
 *
 * @example <WeekBars bars={week} color={cores.metricaSono} textColor={cores.textoSono} format={emHoras} />
 */
interface WeekBarsProps {
  bars: WeekBar[];
  color: string;
  /** A cor do valor de hoje, com o tom escuro no tema claro. */
  textColor: string;
  format: (value: number) => string;
  /** O que o leitor de tela anuncia antes dos valores: "Sono dos últimos 7 dias". */
  label: string;
}

const MIN_HEIGHT_PERCENT = 6;
const EMPTY_HEIGHT_PERCENT = 3;
const OTHER_DAYS_ALPHA = 0.4;

export function WeekBars({ bars, color, textColor, format, label }: WeekBarsProps) {
  const values = bars.map((bar) => bar.value).filter((value): value is number => value !== null);
  const max = Math.max(...values, 1);
  const summary = bars
    .map((bar) => `${bar.label}: ${bar.value === null ? 'sem leitura' : format(bar.value)}`)
    .join(', ');

  return (
    <Vidro className="p-[0.9375rem]" accessible accessibilityLabel={`${label}. ${summary}`}>
      {values.length === 0 ? (
        <Text className="absolute left-0 right-0 top-10 text-center text-[0.75rem] text-placeholder">
          Sem leitura nesta semana
        </Text>
      ) : null}
      <View className="h-28 flex-row items-end gap-[0.4375rem]">
        {bars.map((bar, index) => {
          const today = index === bars.length - 1;
          const height =
            bar.value === null
              ? EMPTY_HEIGHT_PERCENT
              : Math.max(MIN_HEIGHT_PERCENT, (bar.value / max) * 100);
          return (
            <View key={bar.date} className="h-full flex-1 items-center justify-end gap-1.5">
              <Text
                className={cn('text-[0.59375rem] font-bold', today ? null : 'text-placeholder')}
                style={today ? { color: textColor } : undefined}
              >
                {bar.value === null ? '' : format(bar.value)}
              </Text>
              <View
                className="w-full rounded-[0.4375rem]"
                style={{
                  // O rótulo e a inicial ocupam a parte de cima e a de baixo: a barra
                  // divide o resto.
                  height: `${height * 0.7}%`,
                  backgroundColor:
                    bar.value === null
                      ? comOpacidade(color, 0.15)
                      : today
                        ? color
                        : comOpacidade(color, OTHER_DAYS_ALPHA),
                }}
              />
              <Text className="text-[0.625rem] font-bold text-placeholder">{bar.label}</Text>
            </View>
          );
        })}
      </View>
    </Vidro>
  );
}
