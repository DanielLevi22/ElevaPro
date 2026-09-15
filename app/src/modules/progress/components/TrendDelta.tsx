import { formatarDecimal } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { comOpacidade, useCores, useEscala } from '@/shared/design';
import { toneColors } from './tones';

/**
 * A pílula de variação do kit (`Delta`): seta, valor absoluto e unidade.
 *
 *     11,5 / 800, padding 2 × 7, fundo da cor a 16%; neutro em glass-strong
 *
 * `judgement` decide a cor, e não o sinal: carga que cai é ruim, cintura que cai
 * pode ser o objetivo. Onde a direção boa depende de quem treina, é `neutral`
 * (issue #312).
 *
 * @example <TrendDelta value={-2.4} unit="%" judgement="bad" />
 */
interface TrendDeltaProps {
  value: number;
  unit?: string;
  judgement: 'good' | 'bad' | 'neutral';
}

const ICON_SIZE = 12;
const BACKGROUND_ALPHA = 0.16;

export function TrendDelta({ value, unit, judgement }: TrendDeltaProps) {
  const cores = useCores();
  const escalar = useEscala();
  const tone =
    judgement === 'neutral' ? null : toneColors(cores, judgement === 'good' ? 'green' : 'red');
  const textColor = tone?.text ?? cores.mutedForeground;
  const text = `${formatarDecimal(Math.abs(value))}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      className="flex-row items-center gap-[0.1875rem] self-start rounded-full px-[0.4375rem] py-0.5"
      style={{
        backgroundColor: tone ? comOpacidade(tone.fill, BACKGROUND_ALPHA) : cores.glassStrong,
      }}
      accessibilityLabel={`${value > 0 ? 'subiu' : value < 0 ? 'caiu' : 'sem variação'} ${text}`}
    >
      <Ionicons name={iconFor(value)} size={escalar(ICON_SIZE)} color={textColor} />
      <Text className="text-[0.71875rem] font-extrabold" style={{ color: textColor }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * O julgamento de onde subir é bom: carga, volume, aderência, sequência.
 *
 * @example judgementOf(-2.4) // "bad"
 */
export function judgementOf(delta: number): TrendDeltaProps['judgement'] {
  if (delta === 0) return 'neutral';
  return delta > 0 ? 'good' : 'bad';
}

function iconFor(value: number): keyof typeof Ionicons.glyphMap {
  if (value > 0) return 'trending-up';
  return value < 0 ? 'trending-down' : 'remove';
}
