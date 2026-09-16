import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';
import { type ChartTone, type ToneColors, toneColors } from './tones';

/**
 * O gráfico de colunas do kit (`ColumnChart`): uma coluna por semana, a média do
 * período tracejada e a meta na primária.
 *
 *     304 × 150; margem 4 dos lados, 16 em cima, 20 embaixo; folga de 30% entre colunas
 *     trilho de cada coluna a 50%; colunas a 45%; a última em gradiente, com fio branco no topo
 *     valor 9 / 800 em cima (a última na cor), rótulo 9,5 embaixo; média "média N"
 *
 * Semana sem dado fica só com o trilho e sem número: coluna de altura zero leria como
 * semana em que nada foi cumprido.
 *
 * @example
 * <ColumnChart values={[68, 74, null]} labels={['S1', 'S2', 'S3']} tone="green"
 *   format={(v) => `${v}%`} goal={90} accessibilityLabel="Aderência por semana" />
 */
interface ColumnChartProps {
  values: readonly (number | null)[];
  labels: readonly string[];
  tone: ChartTone;
  format: (value: number) => string;
  goal?: number;
  accessibilityLabel: string;
}

const WIDTH = 304;
const HEIGHT = 150;
const PAD = 4;
const TOP = 16;
const BOTTOM = 20;
const HEADROOM = 1.12;
const GAP = 0.3;
const PLOT = HEIGHT - TOP - BOTTOM;

/** A geometria das colunas: onde cada uma começa, a largura e a altura de um valor. */
interface Columns {
  x: (index: number) => number;
  width: number;
  y: (value: number) => number;
}

function columnsFor(count: number, max: number): Columns {
  const band = (WIDTH - PAD * 2) / count;
  return {
    x: (index) => PAD + index * band + (band * GAP) / 2,
    width: band * (1 - GAP),
    y: (value) => TOP + (1 - value / max) * PLOT,
  };
}

export function ColumnChart({
  values,
  labels,
  tone,
  format,
  goal,
  accessibilityLabel,
}: ColumnChartProps) {
  const cores = useCores();
  const escalar = useEscala();
  const gradientId = `col${useId().replace(/:/g, '')}`;
  const colors = toneColors(cores, tone);
  const known = values.filter((value): value is number => value !== null);
  const columns = columnsFor(values.length, Math.max(...known, goal ?? 0, 1) * HEADROOM);
  const average = known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={escalar(HEIGHT)} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.fill} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.fill} stopOpacity={0.28} />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((step) => (
          <Line
            key={step}
            x1={0}
            x2={WIDTH}
            y1={TOP + step * PLOT}
            y2={TOP + step * PLOT}
            stroke={cores.glassBorder}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))}
        {values.map((value, index) => (
          <Column
            // biome-ignore lint/suspicious/noArrayIndexKey: uma coluna por semana, e a semana é a posição
            key={`${labels[index]}${index}`}
            value={value}
            label={labels[index]}
            x={columns.x(index)}
            columns={columns}
            last={index === values.length - 1}
            fill={colors}
            gradientId={gradientId}
            format={format}
          />
        ))}
        {average === null ? null : (
          <AverageLine y={columns.y(average)} text={`média ${format(Math.round(average))}`} />
        )}
        {goal === undefined ? null : (
          <Line
            x1={0}
            x2={WIDTH}
            y1={columns.y(goal)}
            y2={columns.y(goal)}
            stroke={cores.primary}
            strokeWidth={1.4}
            strokeDasharray="4 4"
            strokeOpacity={0.8}
          />
        )}
      </Svg>
    </View>
  );
}

interface ColumnProps {
  value: number | null;
  label: string;
  x: number;
  columns: Columns;
  last: boolean;
  fill: ToneColors;
  gradientId: string;
  format: (value: number) => string;
}

function Column({ value, label, x, columns, last, fill, gradientId, format }: ColumnProps) {
  const cores = useCores();
  const center = x + columns.width / 2;
  return (
    <G>
      <Rect
        x={x}
        y={TOP}
        width={columns.width}
        height={PLOT}
        rx={6}
        fill={cores.glassStrong}
        fillOpacity={0.5}
      />
      {value === null ? null : (
        <G>
          <Rect
            x={x}
            y={columns.y(value)}
            width={columns.width}
            height={HEIGHT - BOTTOM - columns.y(value)}
            rx={6}
            fill={last ? `url(#${gradientId})` : fill.fill}
            fillOpacity={last ? 1 : 0.45}
          />
          {last ? (
            <Rect
              x={x}
              y={columns.y(value)}
              width={columns.width}
              height={3}
              rx={1.5}
              fill={cores.sobreImagem}
              fillOpacity={0.5}
            />
          ) : null}
          <SvgText
            x={center}
            y={columns.y(value) - 6}
            fill={last ? fill.text : cores.placeholder}
            fontSize={9}
            fontWeight="800"
            textAnchor="middle"
          >
            {format(value)}
          </SvgText>
        </G>
      )}
      <SvgText
        x={center}
        y={HEIGHT - 6}
        fill={cores.placeholder}
        fontSize={9.5}
        fontWeight="700"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </G>
  );
}

function AverageLine({ y, text }: { y: number; text: string }) {
  const cores = useCores();
  return (
    <G>
      <Line
        x1={0}
        x2={WIDTH}
        y1={y}
        y2={y}
        stroke={cores.placeholder}
        strokeWidth={1.4}
        strokeDasharray="5 4"
      />
      <SvgText x={2} y={y - 5} fill={cores.placeholder} fontSize={8.5} fontWeight="700">
        {text}
      </SvgText>
    </G>
  );
}
