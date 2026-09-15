import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useEscala } from '@/shared/design';
import { seriesPoints, smoothPath } from './geometry';

/**
 * A linha pequena dos cartões de número (`Spark`).
 *
 *     88 × 26, esticada na largura; área da cor a 38% → 0; traço 1,8; ponto final 2,4
 *
 * Semana sem meta fica fora da linha, e não no zero: 0% de aderência onde não
 * havia plano desenharia um tombo que não aconteceu. Com menos de dois pontos não
 * há linha, e o espaço fica, para os três cartões manterem a mesma altura.
 *
 * @example <Sparkline values={summary.workouts.spark} color={cores.primary} />
 */
interface SparklineProps {
  values: readonly (number | null)[];
  color: string;
}

const WIDTH = 88;
const HEIGHT = 26;

export function Sparkline({ values, color }: SparklineProps) {
  const escalar = useEscala();
  const gradientId = `spark${useId().replace(/:/g, '')}`;
  const known = values.filter((value): value is number => value !== null);
  const min = Math.min(...known);
  const span = Math.max(...known) - min || 1;
  const points = seriesPoints(
    values,
    WIDTH,
    (value) => HEIGHT - 2 - ((value - min) / span) * (HEIGHT - 6)
  );
  const line = smoothPath(points);
  const last = points[points.length - 1];

  return (
    <View className="mt-2" style={{ height: escalar(HEIGHT) }} accessibilityElementsHidden>
      {points.length < 2 ? null : (
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.38} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`${line} L${last[0]},${HEIGHT} L${points[0][0]},${HEIGHT} Z`}
            fill={`url(#${gradientId})`}
          />
          <Path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <Circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
        </Svg>
      )}
    </View>
  );
}
