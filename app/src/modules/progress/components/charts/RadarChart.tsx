import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';

/**
 * O radar do kit (`Radar`): a silhueta de hoje contra a de antes, tracejada.
 *
 *     214 × 214; raio da metade menos 34; quatro anéis de grade e os raios
 *     antes tracejado 4 4 em label3; agora com gradiente radial da primária 42% → 12%
 *     traço 2,4 e ponto de 3,6 em cada eixo; rótulos 9,5 / 700 a 126% do raio
 *
 * Cada eixo é escalado pelo maior dos dois valores dele: peito e panturrilha têm
 * ordens de grandeza diferentes, e uma escala única achataria as medidas pequenas.
 *
 * @example <RadarChart axes={[{ label: 'Peito', now: 104, before: 102 }]} accessibilityLabel="…" />
 */
export interface RadarAxis {
  label: string;
  now: number;
  before: number;
}

interface RadarChartProps {
  axes: readonly RadarAxis[];
  accessibilityLabel: string;
}

const SIZE = 214;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 34;
const RINGS = [0.25, 0.5, 0.75, 1];
const HEADROOM = 1.15;
const GLOW_OPACITY = 0.2;

function pointAt(index: number, count: number, fraction: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const round = (value: number) => Math.round(value * 10) / 10;
  return [
    round(CENTER + RADIUS * fraction * Math.cos(angle)),
    round(CENTER + RADIUS * fraction * Math.sin(angle)),
  ];
}

const polygon = (fractions: readonly number[]) =>
  fractions
    .map((fraction, index) => pointAt(index, fractions.length, fraction).join(','))
    .join(' ');

export function RadarChart({ axes, accessibilityLabel }: RadarChartProps) {
  const cores = useCores();
  const escalar = useEscala();
  const fillId = `radar${useId().replace(/:/g, '')}`;
  const scale = axes.map((axis) => Math.max(axis.now, axis.before) * HEADROOM);
  const now = axes.map((axis, index) => axis.now / scale[index]);
  const before = axes.map((axis, index) => axis.before / scale[index]);

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={escalar(SIZE)} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id={fillId}>
            <Stop offset="0" stopColor={cores.primary} stopOpacity={0.42} />
            <Stop offset="1" stopColor={cores.primary} stopOpacity={0.12} />
          </RadialGradient>
        </Defs>
        {RINGS.map((ring) => (
          <Polygon
            key={ring}
            points={polygon(axes.map(() => ring))}
            fill="none"
            stroke={cores.glassBorder}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, index) => {
          const [x, y] = pointAt(index, axes.length, 1);
          return (
            <Line
              key={axis.label}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke={cores.glassBorder}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={polygon(before)}
          fill="none"
          stroke={cores.placeholder}
          strokeWidth={1.6}
          strokeDasharray="4 4"
        />
        <Polygon
          points={polygon(now)}
          fill="none"
          stroke={cores.primary}
          strokeOpacity={GLOW_OPACITY}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        <Polygon
          points={polygon(now)}
          fill={`url(#${fillId})`}
          stroke={cores.primary}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <AxisDots fractions={now} />
        <AxisLabels labels={axes.map((axis) => axis.label)} />
      </Svg>
    </View>
  );
}

function AxisDots({ fractions }: { fractions: readonly number[] }) {
  const cores = useCores();
  return (
    <G>
      {fractions.map((fraction, index) => {
        const [x, y] = pointAt(index, fractions.length, fraction);
        return (
          <Circle
            // biome-ignore lint/suspicious/noArrayIndexKey: um ponto por eixo, e o eixo é a posição
            key={index}
            cx={x}
            cy={y}
            r={3.6}
            fill={cores.primary}
            stroke={cores.background}
            strokeWidth={1.5}
          />
        );
      })}
    </G>
  );
}

function AxisLabels({ labels }: { labels: readonly string[] }) {
  const cores = useCores();
  return (
    <G>
      {labels.map((label, index) => {
        const [x, y] = pointAt(index, labels.length, 1.26);
        return (
          <SvgText
            key={label}
            x={x}
            y={y + 3}
            fill={cores.mutedForeground}
            fontSize={9.5}
            fontWeight="700"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </G>
  );
}
