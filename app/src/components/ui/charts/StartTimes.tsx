import { timeOf } from '@elevapro/shared';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { comOpacidade, useCores, useEscala } from '@/shared/design';

const WIDTH = 320;
const HEIGHT = 56;
const PADDING = 8;
/** O eixo vai das 5h às 23h: ninguém treina fora disso, e o resto só achata os pontos. */
const FROM = 5 * 60;
const UNTIL = 23 * 60;
const TICKS = ['06:00', '12:00', '18:00', '22:00'];
/** Os pontos se espalham em três faixas, para dois treinos no mesmo horário não virarem um. */
const LANES = 3;
const DOT_ALPHA = 0.55;

const xOf = (minutes: number) => {
  const clamped = Math.min(Math.max(minutes, FROM), UNTIL);
  return PADDING + ((clamped - FROM) / (UNTIL - FROM)) * (WIDTH - 2 * PADDING);
};

/**
 * F2 · Quando a pessoa começou os treinos nas últimas 4 semanas, um ponto por
 * treino, e a linha do horário de costume.
 *
 * @example <StartTimes starts={[1080, 1110]} usual={1095} />
 */
export function StartTimes({ starts, usual }: { starts: readonly number[]; usual: number }) {
  const cores = useCores();
  const escalar = useEscala();
  const laneHeight = (HEIGHT - 2 * PADDING) / LANES;

  return (
    <View>
      <Svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={escalar(HEIGHT)}
        accessibilityLabel={`Seu horário de costume é ${timeOf(usual)}`}
      >
        <Line
          x1={xOf(usual)}
          x2={xOf(usual)}
          y1={0}
          y2={HEIGHT}
          stroke={cores.primary}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        {starts.map((minutes, index) => (
          <Circle
            // biome-ignore lint/suspicious/noArrayIndexKey: dois treinos podem começar no mesmo minuto
            key={`${index}-${minutes}`}
            cx={xOf(minutes)}
            cy={PADDING + laneHeight * ((index % LANES) + 0.5)}
            r={4}
            fill={comOpacidade(cores.primary, DOT_ALPHA)}
          />
        ))}
      </Svg>
      <View className="mt-1 flex-row justify-between">
        {TICKS.map((tick) => (
          <Text key={tick} className="font-mono text-[0.5625rem] text-placeholder">
            {tick}
          </Text>
        ))}
      </View>
    </View>
  );
}
