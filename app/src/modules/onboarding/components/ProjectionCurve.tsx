import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores, useEscala } from '@/shared/design';
import type { WeightProjection } from '../services/projection';

/** O desenho do kit (`Curva`): 320 × 120, a linha e a faixa provável em volta. */
const VIEWBOX = '0 0 320 120';
const HEIGHT = 120;
const GRID_LINES = [30, 60, 90];
/** A curva de perda do kit; a de ganho é o espelho vertical. */
const LOSS_LINE = 'M8 34 C 90 44, 170 76, 312 84';
const LOSS_BAND = 'M8 34 C 90 40, 170 64, 312 70 L 312 98 C 170 92, 90 52, 8 34 Z';
const GAIN_LINE = 'M8 86 C 90 76, 170 44, 312 36';
const GAIN_BAND = 'M8 86 C 90 80, 170 56, 312 50 L 312 22 C 170 28, 90 68, 8 86 Z';
const NOTE_ICON_SIZE = 14;
const BAND_ALPHA = 0.14;

const kg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * A projeção de O8 (`Curva` do kit): o peso de hoje e a faixa provável em 16
 * semanas, marcada como estimativa. Esmaecida quando a montagem do plano falhou.
 *
 * @example <ProjectionCurve projection={projecao} />
 */
export function ProjectionCurve({
  projection,
  faded = false,
}: {
  projection: WeightProjection;
  faded?: boolean;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const loss = projection.direction === 'loss';
  const { from, to } = projection.likelyEndKg;

  return (
    <Vidro classeExterna={cn('mt-[1.375rem]', faded && 'opacity-[0.45]')} className="p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
          Projeção · estimativa
        </Text>
        <Text className="text-[0.6875rem] font-semibold text-hero-secondary">
          {`${projection.weeks} semanas`}
        </Text>
      </View>
      {/* `Svg` não recebe classe: o espaço de cima fica no `View` em volta. */}
      <View className="mt-[0.625rem]">
        <Svg
          viewBox={VIEWBOX}
          width="100%"
          height={escalar(HEIGHT)}
          accessibilityLabel={`Peso de ${kg(projection.startKg)} kg hoje para ${kg(from)} a ${kg(to)} kg em ${projection.weeks} semanas`}
        >
          {GRID_LINES.map((y) => (
            <Line
              key={y}
              x1={0}
              x2={320}
              y1={y}
              y2={y}
              stroke={cores.glassBorder}
              strokeDasharray="2 4"
            />
          ))}
          <Path d={loss ? LOSS_BAND : GAIN_BAND} fill={comOpacidade(cores.primary, BAND_ALPHA)} />
          <Path
            d={loss ? LOSS_LINE : GAIN_LINE}
            fill="none"
            stroke={cores.primary}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={8} cy={loss ? 34 : 86} r={5} fill={cores.primary} />
        </Svg>
      </View>
      <View className="mt-1 flex-row justify-between">
        <Text className="text-[0.6875rem] text-hero-secondary">
          <Text className="font-bold text-hero">Hoje</Text>
          {` · ${kg(projection.startKg)} kg`}
        </Text>
        <Text className="text-[0.6875rem] text-hero-secondary">{`faixa provável: ${kg(from)} a ${kg(to)} kg`}</Text>
      </View>
      <View className="mt-2.5 flex-row items-start gap-2">
        <Ionicons
          name="information-circle-outline"
          size={escalar(NOTE_ICON_SIZE)}
          color={cores.placeholder}
        />
        <Text className="flex-1 text-[0.71875rem] leading-[1rem] text-hero-secondary">
          Estimativa; recalibramos com seus dados em 2 a 4 semanas.
        </Text>
      </View>
    </Vidro>
  );
}
