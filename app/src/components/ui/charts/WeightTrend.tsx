import type { WeightPoint } from '@elevapro/shared';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { comOpacidade, useCores, useEscala } from '@/shared/design';
import { trendGeometry } from './weightTrendGeometry';

const WIDTH = 320;
const HEIGHT = 110;
const BAND_ALPHA = 0.12;
const BAND_EDGE_ALPHA = 0.45;

/**
 * A tendência do peso no ajuste da semana (`Tendencia` do kit): as pesagens em
 * pontos, a tendência na cor da marca e a faixa do ritmo da meta.
 *
 * @example <WeightTrend weights={proposta.weights} expectedChangeKg={-0.5} />
 */
export function WeightTrend({
  weights,
  expectedChangeKg,
}: {
  weights: WeightPoint[];
  expectedChangeKg: number | null;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const geometry = trendGeometry(weights, expectedChangeKg, { width: WIDTH, height: HEIGHT });
  const band = comOpacidade(cores.primary, BAND_EDGE_ALPHA);

  return (
    <View>
      <Svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={escalar(HEIGHT)}
        accessibilityLabel={geometry.label}
      >
        {geometry.band ? (
          <>
            <Path d={geometry.band.area} fill={comOpacidade(cores.primary, BAND_ALPHA)} />
            <Path d={geometry.band.upper} fill="none" stroke={band} strokeDasharray="3 3" />
            <Path d={geometry.band.lower} fill="none" stroke={band} strokeDasharray="3 3" />
          </>
        ) : null}
        {geometry.points.map((point) => (
          <Circle key={point.key} cx={point.x} cy={point.y} r={2.8} fill={cores.placeholder} />
        ))}
        {geometry.trend ? (
          <Path
            d={geometry.trend}
            fill="none"
            stroke={cores.primary}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        ) : null}
        {geometry.last ? (
          <Circle cx={geometry.last.x} cy={geometry.last.y} r={4.5} fill={cores.primary} />
        ) : null}
      </Svg>
      <Legend withBand={Boolean(geometry.band)} />
    </View>
  );
}

function Legend({ withBand }: { withBand: boolean }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-3.5">
      <LegendItem mark={<View className="h-1.5 w-1.5 rounded-full bg-placeholder" />}>
        Pesagem
      </LegendItem>
      <LegendItem mark={<View className="h-[0.1875rem] w-3.5 rounded-full bg-primary" />}>
        Tendência
      </LegendItem>
      {withBand ? (
        <LegendItem
          mark={
            <View className="h-2 w-3.5 rounded-[0.1875rem] border border-dashed border-primary/45 bg-primary/10" />
          }
        >
          Ritmo da meta
        </LegendItem>
      ) : null}
    </View>
  );
}

function LegendItem({ mark, children }: { mark: React.ReactNode; children: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      {mark}
      <Text className="text-[0.65625rem] text-hero-secondary">{children}</Text>
    </View>
  );
}
