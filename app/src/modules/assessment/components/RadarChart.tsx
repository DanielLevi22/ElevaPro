import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { colors } from '@/constants/colors';

/**
 * O radar dos três scores da análise postural.
 *
 * Extraído da tela, que passava de 700 linhas. Componente de apresentação puro:
 * recebe os números e desenha, sem saber de onde vieram.
 */

// Radar Chart Component
export const RadarChart = ({
  data,
  size = 120,
}: {
  data: Record<string, number>;
  size?: number;
}) => {
  const center = size / 2;
  const radius = (size - 40) / 2; // padding
  const AngleOffsets = { top: -90, right: 30, left: 150 };

  // Points for 3 axes (Triangle)
  const points = [
    { label: 'SIMETRIA', value: data.symmetry, angle: AngleOffsets.top },
    { label: 'MUSCULAR', value: data.muscle, angle: AngleOffsets.right },
    { label: 'POSTURA', value: data.posture, angle: AngleOffsets.left },
  ];

  const getCoordinates = (angle: number, value: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * (value / 100) * Math.cos(rad),
      y: center + radius * (value / 100) * Math.sin(rad),
    };
  };

  // Background Triangle (100% scale)
  const bgPoints = points
    .map((p) => {
      const c = getCoordinates(p.angle, 100);
      return `${c.x},${c.y}`;
    })
    .join(' ');

  // Data Triangle
  const dataPoints = points
    .map((p) => {
      const c = getCoordinates(p.angle, p.value);
      return `${c.x},${c.y}`;
    })
    .join(' ');

  return (
    <View className="items-center justify-center py-2 h-[160px]">
      <Svg height={size} width={size * 1.5}>
        {/* Axes Lines */}
        {points.map((p, _i) => {
          const start = getCoordinates(p.angle, 0);
          const end = getCoordinates(p.angle, 100);
          return (
            <Line
              key={p.angle}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Background Shape */}
        <Polygon
          points={bgPoints}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* Data Shape */}
        <Polygon
          points={dataPoints}
          fill={`${colors.primary.solid}33`}
          stroke={colors.primary.solid}
          strokeWidth="2"
        />

        {/* Data Points & Labels */}
        {points.map((p, i) => {
          const c = getCoordinates(p.angle, p.value);
          const labelPos = getCoordinates(p.angle, 125); // Push labels out slightly

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: radar chart points
            <React.Fragment key={i}>
              <Circle cx={c.x} cy={c.y} r="3" fill={colors.primary.solid} />
              {/* Label */}
              <SvgText
                x={labelPos.x}
                y={labelPos.y}
                fill="rgba(255,255,255,0.6)"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.label}
              </SvgText>
              {/* Value */}
              <SvgText
                x={labelPos.x}
                y={labelPos.y + 12}
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.value}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};
