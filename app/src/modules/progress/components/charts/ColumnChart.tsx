import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';
import { type ChartTone, toneColors } from '../tones';

/**
 * O gráfico de colunas do kit (`ColumnChart`): uma coluna por semana, a média
 * do período tracejada e a meta na primária.
 *
 *     304 × 150; margem 4 dos lados, 16 em cima, 20 embaixo; folga de 30% entre colunas
 *     trilho de cada coluna a 50%; colunas a 45%; a última em gradiente, com fio branco no topo
 *     valor 9 / 800 em cima (a última na cor), rótulo 9,5 embaixo; média "média N"
 *
 * Semana sem dado fica só com o trilho e sem número: coluna de altura zero leria
 * como semana em que nada foi cumprido.
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
  const max = Math.max(...known, goal ?? 0, 1) * HEADROOM;
  const average = known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
  const band = (WIDTH - PAD * 2) / values.length;
  const barWidth = band * (1 - GAP);
  const y = (value: number) => TOP + (1 - value / max) * (HEIGHT - TOP - BOTTOM);
  const lastIndex = values.length - 1;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={escalar(HEIGHT)} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.fill} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.fill} stopOpacity={0.28} />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((step) => {
          const lineY = TOP + step * (HEIGHT - TOP - BOTTOM);
          return (
            <Line
              key={step}
              x1={0}
              x2={WIDTH}
              y1={lineY}
              y2={lineY}
              stroke={cores.glassBorder}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          );
        })}
        {values.map((value, index) => {
          const x = PAD + index * band + (band * GAP) / 2;
          const last = index === lastIndex;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: uma coluna por semana, e a semana é a posição
            <G key={`${labels[index]}${index}`}>
              <Rect
                x={x}
                y={TOP}
                width={barWidth}
                height={HEIGHT - TOP - BOTTOM}
                rx={6}
                fill={cores.glassStrong}
                fillOpacity={0.5}
              />
              {value === null ? null : (
                <G>
                  <Rect
                    x={x}
                    y={y(value)}
                    width={barWidth}
                    height={HEIGHT - BOTTOM - y(value)}
                    rx={6}
                    fill={last ? `url(#${gradientId})` : colors.fill}
                    fillOpacity={last ? 1 : 0.45}
                  />
                  {last ? (
                    <Rect
                      x={x}
                      y={y(value)}
                      width={barWidth}
                      height={3}
                      rx={1.5}
                      fill={cores.sobreImagem}
                      fillOpacity={0.5}
                    />
                  ) : null}
                  <SvgText
                    x={x + barWidth / 2}
                    y={y(value) - 6}
                    fill={last ? colors.text : cores.placeholder}
                    fontSize={9}
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {format(value)}
                  </SvgText>
                </G>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={HEIGHT - 6}
                fill={cores.placeholder}
                fontSize={9.5}
                fontWeight="700"
                textAnchor="middle"
              >
                {labels[index]}
              </SvgText>
            </G>
          );
        })}
        {average === null ? null : (
          <G>
            <Line
              x1={0}
              x2={WIDTH}
              y1={y(average)}
              y2={y(average)}
              stroke={cores.placeholder}
              strokeWidth={1.4}
              strokeDasharray="5 4"
            />
            <SvgText
              x={2}
              y={y(average) - 5}
              fill={cores.placeholder}
              fontSize={8.5}
              fontWeight="700"
            >
              {`média ${format(Math.round(average))}`}
            </SvgText>
          </G>
        )}
        {goal === undefined ? null : (
          <Line
            x1={0}
            x2={WIDTH}
            y1={y(goal)}
            y2={y(goal)}
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
