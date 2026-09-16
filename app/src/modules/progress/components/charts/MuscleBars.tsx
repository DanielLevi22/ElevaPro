import { MUSCLE_GROUP_LABELS, type MuscleVolume } from '@elevapro/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { comOpacidade, useCores } from '@/shared/design';
import { type ChartTone, toneColors } from '../tones';
import { formatLoad, type LoadUnit, loadUnit } from './loadFormat';

/**
 * As barras horizontais do kit (`HBars`): o volume de cada grupo, com o período
 * anterior como sombra por trás, para ler a variação sem outro gráfico.
 *
 *     rótulo 12; diferença 10,5 / 700 verde ou vermelha; valor 12,5 / 800 na cor
 *     trilho de 11, a sombra na cor a 28%, a barra em gradiente da cor a 55% à cheia
 *
 * @example <MuscleBars data={load.byMuscle} />
 */
interface MuscleBarsProps {
  data: readonly MuscleVolume[];
}

const TONES: ChartTone[] = ['brand', 'blue', 'green', 'purple', 'amber'];
const SHADOW_ALPHA = 0.28;
const GRADIENT_START_ALPHA = 0.55;
/** O banco guarda o grupo sem acento; o que não está na lista aparece como veio. */
const LABELS: Readonly<Record<string, string>> = MUSCLE_GROUP_LABELS;

export function MuscleBars({ data }: MuscleBarsProps) {
  const max = Math.max(...data.map((item) => item.current), 1);
  return (
    <View className="gap-[0.6875rem]">
      {data.map((item, index) => (
        <MuscleBar
          key={item.muscle}
          item={item}
          tone={TONES[index % TONES.length]}
          max={max}
          unit={loadUnit(max)}
        />
      ))}
      <View className="mt-0.5 flex-row items-center gap-[0.4375rem]">
        <View className="h-[0.4375rem] w-4 rounded-full bg-placeholder opacity-50" />
        <Text className="text-[0.65625rem] text-placeholder">sombra = período anterior</Text>
      </View>
    </View>
  );
}

interface MuscleBarProps {
  item: MuscleVolume;
  tone: ChartTone;
  max: number;
  unit: LoadUnit;
}

function MuscleBar({ item, tone, max, unit }: MuscleBarProps) {
  const cores = useCores();
  const colors = toneColors(cores, tone);
  const label = LABELS[item.muscle] ?? item.muscle;
  const difference = item.current - item.previous;
  const differenceColor = toneColors(cores, difference >= 0 ? 'green' : 'red').text;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatLoad(item.current, unit)}, antes ${formatLoad(item.previous, unit)}`}
    >
      <View className="mb-[0.3125rem] flex-row items-baseline justify-between">
        <Text className="text-[0.75rem] text-muted-foreground">{label}</Text>
        <View className="flex-row items-baseline gap-[0.4375rem]">
          <Text className="text-[0.65625rem] font-bold" style={{ color: differenceColor }}>
            {`${difference >= 0 ? '+' : '−'}${formatLoad(Math.abs(difference), unit, false)}`}
          </Text>
          <Text className="text-[0.78125rem] font-extrabold" style={{ color: colors.text }}>
            {formatLoad(item.current, unit)}
          </Text>
        </View>
      </View>
      <View className="h-[0.6875rem] overflow-hidden rounded-full bg-glass-strong">
        <View
          className="absolute bottom-0 left-0 top-0"
          style={{
            width: `${Math.min(100, (item.previous / max) * 100)}%`,
            backgroundColor: comOpacidade(colors.fill, SHADOW_ALPHA),
          }}
        />
        <LinearGradient
          colors={[comOpacidade(colors.fill, GRADIENT_START_ALPHA), colors.fill]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          className="absolute bottom-0 left-0 top-0 rounded-full"
          style={{ width: `${(item.current / max) * 100}%` }}
        />
      </View>
    </View>
  );
}
