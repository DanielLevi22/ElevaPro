import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';
import { type ChartTone, toneColors } from '../tones';

/**
 * A rosca do kit (`Donut`): uma fatia por categoria, o total no meio e a legenda
 * com o percentual e a barra de cada uma ao lado.
 *
 *     124 × 124, traço 17, começa no topo; fatia com 4 de folga e ponta redonda
 *     total 22 / 800; unidade 8,5 / 700 / .1em; legenda 11,5, barra de 4
 *
 * @example
 * <Donut unit="séries" slices={[{ label: 'Hipertrofia', value: 128, tone: 'brand' }]} />
 */
export interface DonutSlice {
  label: string;
  value: number;
  tone: ChartTone;
}

interface DonutProps {
  slices: readonly DonutSlice[];
  unit: string;
}

const SIZE = 124;
const STROKE = 17;
const GAP = 4;
const GLOW_OPACITY = 0.2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

export function Donut({ slices, unit }: DonutProps) {
  const escalar = useEscala();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <View className="flex-row items-center gap-4">
      <View style={{ width: escalar(SIZE), height: escalar(SIZE) }} accessibilityElementsHidden>
        <Ring slices={slices} total={total} />
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-display-black text-[1.375rem] tracking-tight text-foreground">
            {total}
          </Text>
          <Text className="text-[0.53125rem] font-bold uppercase tracking-[0.1em] text-placeholder">
            {unit}
          </Text>
        </View>
      </View>
      <View className="min-w-0 flex-1 gap-[0.5625rem]">
        {slices.map((slice) => (
          <Legend
            key={slice.label}
            slice={slice}
            percent={Math.round((slice.value / total) * 100)}
          />
        ))}
      </View>
    </View>
  );
}

/** Onde cada fatia começa no anel: a soma das anteriores. Vazia fica fora, ou viraria um ponto solto. */
function arcsOf(slices: readonly DonutSlice[], total: number) {
  let start = 0;
  return slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const length = (slice.value / total) * CIRCUMFERENCE;
      const arc = { slice, dash: `${Math.max(0, length - GAP)} ${CIRCUMFERENCE}`, offset: -start };
      start += length;
      return arc;
    });
}

function Ring({ slices, total }: { slices: readonly DonutSlice[]; total: number }) {
  const cores = useCores();
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <G transform={`rotate(-90 ${CENTER} ${CENTER})`}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={cores.glassStrong}
          strokeWidth={STROKE}
        />
        {arcsOf(slices, total).map(({ slice, dash, offset }) => {
          const arc = {
            cx: CENTER,
            cy: CENTER,
            r: RADIUS,
            fill: 'none',
            strokeDasharray: dash,
            strokeDashoffset: offset,
          };
          const color = toneColors(cores, slice.tone).fill;
          return (
            <G key={slice.label}>
              <Circle
                {...arc}
                stroke={color}
                strokeOpacity={GLOW_OPACITY}
                strokeWidth={STROKE + 4}
                strokeLinecap="round"
              />
              <Circle {...arc} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

function Legend({ slice, percent }: { slice: DonutSlice; percent: number }) {
  const colors = toneColors(useCores(), slice.tone);
  return (
    <View accessible accessibilityLabel={`${slice.label}: ${percent}%`}>
      <View className="mb-1 flex-row items-center gap-[0.4375rem]">
        <View className="h-2 w-2 rounded-[0.15625rem]" style={{ backgroundColor: colors.fill }} />
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[0.71875rem] text-muted-foreground">
          {slice.label}
        </Text>
        <Text className="text-[0.71875rem] font-extrabold" style={{ color: colors.text }}>
          {`${percent}%`}
        </Text>
      </View>
      <View className="h-1 overflow-hidden rounded-full bg-glass-strong">
        <View
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: colors.fill }}
        />
      </View>
    </View>
  );
}
