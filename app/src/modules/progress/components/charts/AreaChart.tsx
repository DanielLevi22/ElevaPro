import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';
import { type ChartTone, toneColors } from '../tones';
import { type Point, smoothPath } from './geometry';

/**
 * O gráfico de linha com área do kit (`AreaChart`).
 *
 *     304 × altura; margem 10 dos lados, 16 em cima, 20 embaixo
 *     quatro linhas de grade; área da primeira série a 34% → 6% em 70% → 0
 *     traço 2,6 (a segunda série 2, tracejada 5 5); meta tracejada com rótulo à direita
 *     máximo e mínimo anotados; último valor com halo de 9, ponto de 4,5 e pílula
 *
 * O `drop-shadow` do traço vira um traço largo e translúcido por baixo: `filter`
 * no Android desenha a view numa camada do tamanho da caixa e recorta o halo.
 *
 * O `viewBox` fixo com a altura escalada reproduz o `width: 100%` do kit: o
 * desenho cresce na proporção da tela, e o texto dentro dele junto.
 *
 * @example
 * <AreaChart series={[{ values: weekly, tone: 'brand' }]} labels={['S1', 'S12']}
 *   format={(v) => formatarDecimal(v / 1000)} suffix=" t" />
 */
interface ChartSeries {
  values: readonly number[];
  tone: ChartTone;
  dashed?: boolean;
}

interface AreaChartProps {
  series: readonly ChartSeries[];
  labels: readonly string[];
  format: (value: number) => string;
  /** Vai só na pílula do último valor: "95 kg". */
  suffix?: string;
  height?: number;
  goal?: { value: number; label: string };
  /** O que o leitor de tela anuncia no lugar do desenho. */
  accessibilityLabel: string;
}

const WIDTH = 304;
const PAD_X = 10;
const TOP = 16;
const BOTTOM = 20;
const MARGIN = 0.16;
const GRID = [0, 0.33, 0.66, 1];
const GRID_OPACITY = 0.55;
const GLOW_OPACITY = 0.18;

export function AreaChart({
  series,
  labels,
  format,
  suffix = '',
  height = 150,
  goal,
  accessibilityLabel,
}: AreaChartProps) {
  const cores = useCores();
  const escalar = useEscala();
  const gradientId = `area${useId().replace(/:/g, '')}`;
  const [main] = series;
  if (!main || main.values.length < 2) return null;

  const all = series.flatMap((item) => item.values).concat(goal ? [goal.value] : []);
  const low = Math.min(...all);
  const span = Math.max(...all) - low || 1;
  const min = low - span * MARGIN;
  const range = span * (1 + 2 * MARGIN);
  const count = main.values.length;
  const x = (index: number) => PAD_X + (index * (WIDTH - PAD_X * 2)) / (count - 1);
  const y = (value: number) => TOP + (1 - (value - min) / range) * (height - TOP - BOTTOM);
  const mainColor = toneColors(cores, main.tone).fill;
  const mainPoints: Point[] = main.values.map((value, index) => [x(index), y(value)]);
  const last = mainPoints[count - 1];

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={escalar(height)} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mainColor} stopOpacity={0.34} />
            <Stop offset="0.7" stopColor={mainColor} stopOpacity={0.06} />
            <Stop offset="1" stopColor={mainColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {GRID.map((step) => {
          const lineY = TOP + step * (height - TOP - BOTTOM);
          return (
            <Line
              key={step}
              x1={0}
              x2={WIDTH}
              y1={lineY}
              y2={lineY}
              stroke={cores.glassBorder}
              strokeOpacity={GRID_OPACITY}
              strokeWidth={1}
            />
          );
        })}
        {goal ? (
          <G>
            <Line
              x1={0}
              x2={WIDTH}
              y1={y(goal.value)}
              y2={y(goal.value)}
              stroke={cores.placeholder}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <SvgText
              x={WIDTH}
              y={y(goal.value) - 6}
              fill={cores.placeholder}
              fontSize={9}
              fontWeight="700"
              textAnchor="end"
            >
              {`${goal.label} ${format(goal.value)}`}
            </SvgText>
          </G>
        ) : null}
        <Path
          d={`${smoothPath(mainPoints)} L${last[0]},${height - BOTTOM} L${mainPoints[0][0]},${height - BOTTOM} Z`}
          fill={`url(#${gradientId})`}
        />
        {series.map((item, index) => (
          <SeriesLine
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem das séries é fixa, e a posição é a identidade
            key={`${item.tone}${index}`}
            item={item}
            points={item.values.map((value, i) => [x(i), y(value)])}
            primary={index === 0}
          />
        ))}
        <Extremes values={main.values} x={x} y={y} color={mainColor} format={format} />
        <Line
          x1={last[0]}
          x2={last[0]}
          y1={last[1]}
          y2={height - BOTTOM}
          stroke={mainColor}
          strokeWidth={1}
          strokeOpacity={0.35}
          strokeDasharray="3 3"
        />
        <Circle cx={last[0]} cy={last[1]} r={9} fill={mainColor} fillOpacity={0.18} />
        <Circle
          cx={last[0]}
          cy={last[1]}
          r={4.5}
          fill={mainColor}
          stroke={cores.background}
          strokeWidth={2}
        />
        <G
          transform={`translate(${Math.min(last[0], WIDTH - 46)}, ${Math.max(TOP - 4, last[1] - 22)})`}
        >
          <Rect x={-26} y={-11} width={52} height={19} rx={9.5} fill={mainColor} />
          <SvgText
            x={0}
            y={3}
            fill={cores.sobreMetrica}
            fontSize={10.5}
            fontWeight="800"
            textAnchor="middle"
          >
            {`${format(main.values[count - 1])}${suffix}`}
          </SvgText>
        </G>
      </Svg>
      <View className="mt-0.5 flex-row justify-between">
        {labels.map((label, index) => (
          <Text
            // biome-ignore lint/suspicious/noArrayIndexKey: dois meses iguais no eixo são posições diferentes
            key={`${label}${index}`}
            className="text-[0.59375rem] font-semibold text-placeholder"
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SeriesLine({
  item,
  points,
  primary,
}: {
  item: ChartSeries;
  points: Point[];
  primary: boolean;
}) {
  const cores = useCores();
  const color = toneColors(cores, item.tone).fill;
  const path = smoothPath(points);
  const width = primary ? 2.6 : 2;
  return (
    <G>
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={GLOW_OPACITY}
        strokeWidth={width * 3}
        strokeLinecap="round"
      />
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={item.dashed ? '5 5' : undefined}
        strokeLinecap="round"
      />
    </G>
  );
}

interface ExtremesProps {
  values: readonly number[];
  x: (index: number) => number;
  y: (value: number) => number;
  color: string;
  format: (value: number) => string;
}

/** O máximo e o mínimo da série, anotados; o último valor já tem a pílula. */
function Extremes({ values, x, y, color, format }: ExtremesProps) {
  const cores = useCores();
  const lastIndex = values.length - 1;
  const indexes = [values.indexOf(Math.max(...values)), values.indexOf(Math.min(...values))];
  const marked = [...new Set(indexes)].filter((index) => index !== lastIndex);
  return (
    <G>
      {marked.map((index) => (
        <G key={index}>
          <Circle
            cx={x(index)}
            cy={y(values[index])}
            r={3}
            fill={cores.background}
            stroke={color}
            strokeWidth={1.6}
          />
          <SvgText
            x={x(index)}
            y={y(values[index]) - 9}
            fill={cores.placeholder}
            fontSize={8.5}
            fontWeight="700"
            textAnchor="middle"
          >
            {format(values[index])}
          </SvgText>
        </G>
      ))}
    </G>
  );
}
