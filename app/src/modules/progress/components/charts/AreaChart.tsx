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
import { type ChartTone, toneColors } from '@/components/ui/charts/tones';
import { useCores, useEscala } from '@/shared/design';
import { type Point, smoothPath } from './geometry';

/**
 * O gráfico de linha com área do kit (`AreaChart`).
 *
 *     304 × altura; margem 10 dos lados, 16 em cima, 20 embaixo
 *     quatro linhas de grade; área a 34% → 6% em 70% → 0; traço de 2,6
 *     meta tracejada com rótulo à direita; máximo e mínimo anotados
 *     último valor com halo de 9, ponto de 4,5 e pílula
 *
 * O `drop-shadow` do traço vira um traço largo e translúcido por baixo: `filter`
 * no Android desenha a view numa camada do tamanho da caixa e recorta o halo.
 *
 * O `viewBox` fixo com a altura escalada reproduz o `width: 100%` do kit: o desenho
 * cresce na proporção da tela, e o texto dentro dele junto.
 *
 * @example
 * <AreaChart values={weekly} tone="brand" labels={['S1', 'S12']} format={toTonnes}
 *   suffix=" t" accessibilityLabel="Carga por semana" />
 */
interface AreaChartProps {
  values: readonly number[];
  tone: ChartTone;
  labels: readonly string[];
  format: (value: number) => string;
  /** Vai só na pílula do último valor: "95 kg". */
  suffix?: string;
  goal?: { value: number; label: string };
  /** O que o leitor de tela anuncia no lugar do desenho. */
  accessibilityLabel: string;
}

const WIDTH = 304;
const HEIGHT = 150;
const PAD_X = 10;
const TOP = 16;
const BOTTOM = 20;
const MARGIN = 0.16;
const GRID = [0, 0.33, 0.66, 1];
const GRID_OPACITY = 0.55;
const GLOW_OPACITY = 0.18;

/** Onde cada valor cai no desenho, com 16% de folga acima e abaixo dos extremos. */
interface Scale {
  x: (index: number) => number;
  y: (value: number) => number;
}

function scaleFor(values: readonly number[], goal: number | undefined): Scale {
  const all = goal === undefined ? values : [...values, goal];
  const low = Math.min(...all);
  const span = Math.max(...all) - low || 1;
  const min = low - span * MARGIN;
  const range = span * (1 + 2 * MARGIN);
  return {
    x: (index) => PAD_X + (index * (WIDTH - PAD_X * 2)) / (values.length - 1),
    y: (value) => TOP + (1 - (value - min) / range) * (HEIGHT - TOP - BOTTOM),
  };
}

export function AreaChart({
  values,
  tone,
  labels,
  format,
  suffix = '',
  goal,
  accessibilityLabel,
}: AreaChartProps) {
  const cores = useCores();
  const escalar = useEscala();
  const gradientId = `area${useId().replace(/:/g, '')}`;
  if (values.length < 2) return null;

  const color = toneColors(cores, tone).fill;
  const scale = scaleFor(values, goal?.value);
  const points: Point[] = values.map((value, index) => [scale.x(index), scale.y(value)]);
  const line = smoothPath(points);
  const last = points[points.length - 1];

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={escalar(HEIGHT)} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <AreaGradient id={gradientId} color={color} />
        <GridLines />
        {goal ? (
          <GoalLine y={scale.y(goal.value)} text={`${goal.label} ${format(goal.value)}`} />
        ) : null}
        <Path
          d={`${line} L${last[0]},${HEIGHT - BOTTOM} L${points[0][0]},${HEIGHT - BOTTOM} Z`}
          fill={`url(#${gradientId})`}
        />
        <Path
          d={line}
          fill="none"
          stroke={color}
          strokeOpacity={GLOW_OPACITY}
          strokeWidth={7.8}
          strokeLinecap="round"
        />
        <Path d={line} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        <Extremes values={values} scale={scale} color={color} format={format} />
        <LastValue
          point={last}
          color={color}
          text={`${format(values[values.length - 1])}${suffix}`}
        />
      </Svg>
      <AxisLabels labels={labels} />
    </View>
  );
}

function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={color} stopOpacity={0.34} />
        <Stop offset="0.7" stopColor={color} stopOpacity={0.06} />
        <Stop offset="1" stopColor={color} stopOpacity={0} />
      </LinearGradient>
    </Defs>
  );
}

function GridLines() {
  const cores = useCores();
  return (
    <G>
      {GRID.map((step) => {
        const y = TOP + step * (HEIGHT - TOP - BOTTOM);
        return (
          <Line
            key={step}
            x1={0}
            x2={WIDTH}
            y1={y}
            y2={y}
            stroke={cores.glassBorder}
            strokeOpacity={GRID_OPACITY}
            strokeWidth={1}
          />
        );
      })}
    </G>
  );
}

function GoalLine({ y, text }: { y: number; text: string }) {
  const cores = useCores();
  return (
    <G>
      <Line
        x1={0}
        x2={WIDTH}
        y1={y}
        y2={y}
        stroke={cores.placeholder}
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />
      <SvgText
        x={WIDTH}
        y={y - 6}
        fill={cores.placeholder}
        fontSize={9}
        fontWeight="700"
        textAnchor="end"
      >
        {text}
      </SvgText>
    </G>
  );
}

/** O ponto de hoje: fio até o chão, halo, ponto com contorno da tela e a pílula. */
function LastValue({ point, color, text }: { point: Point; color: string; text: string }) {
  const cores = useCores();
  const [x, y] = point;
  return (
    <G>
      <Line
        x1={x}
        x2={x}
        y1={y}
        y2={HEIGHT - BOTTOM}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.35}
        strokeDasharray="3 3"
      />
      <Circle cx={x} cy={y} r={9} fill={color} fillOpacity={0.18} />
      <Circle cx={x} cy={y} r={4.5} fill={color} stroke={cores.background} strokeWidth={2} />
      <G transform={`translate(${Math.min(x, WIDTH - 46)}, ${Math.max(TOP - 4, y - 22)})`}>
        <Rect x={-26} y={-11} width={52} height={19} rx={9.5} fill={color} />
        <SvgText
          x={0}
          y={3}
          fill={cores.sobreMetrica}
          fontSize={10.5}
          fontWeight="800"
          textAnchor="middle"
        >
          {text}
        </SvgText>
      </G>
    </G>
  );
}

interface ExtremesProps {
  values: readonly number[];
  scale: Scale;
  color: string;
  format: (value: number) => string;
}

/** O máximo e o mínimo da série, anotados; o último valor já tem a pílula. */
function Extremes({ values, scale, color, format }: ExtremesProps) {
  const cores = useCores();
  const lastIndex = values.length - 1;
  const indexes = [values.indexOf(Math.max(...values)), values.indexOf(Math.min(...values))];
  const marked = [...new Set(indexes)].filter((index) => index !== lastIndex);
  return (
    <G>
      {marked.map((index) => (
        <G key={index}>
          <Circle
            cx={scale.x(index)}
            cy={scale.y(values[index])}
            r={3}
            fill={cores.background}
            stroke={color}
            strokeWidth={1.6}
          />
          <SvgText
            x={scale.x(index)}
            y={scale.y(values[index]) - 9}
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

function AxisLabels({ labels }: { labels: readonly string[] }) {
  return (
    <View className="mt-0.5 flex-row justify-between">
      {labels.map((label, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: dois meses iguais no eixo são posições diferentes
        <Text key={`${label}${index}`} className="text-[0.59375rem] font-semibold text-placeholder">
          {label}
        </Text>
      ))}
    </View>
  );
}
