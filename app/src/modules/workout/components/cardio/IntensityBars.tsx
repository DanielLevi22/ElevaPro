import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import {
  barHeight,
  INTENSITY_SAMPLES,
  isHighSample,
  type MovementIntensity,
} from '../../hooks/useMovementIntensity';

/**
 * "Intensidade" com as barras das últimas leituras e a faixa à direita, como a
 * linha de vidro sob o mostrador do kit. Antes da primeira leitura as barras
 * ficam baixas: vazio, e não um gráfico inventado.
 *
 * @example <IntensityBars intensity={useMovementIntensity(true)} />
 */
export function IntensityBars({ intensity }: { intensity: MovementIntensity }) {
  const padding = Array.from({ length: INTENSITY_SAMPLES - intensity.samples.length }, () => 0);
  const bars = [...padding, ...intensity.samples];

  return (
    <Vidro
      classeExterna="mt-3.5"
      className="flex-row items-center gap-3 px-3.5 py-3"
      accessible
      accessibilityLabel={`Intensidade ${intensity.level}`}
    >
      <Text className="shrink-0 text-[0.625rem] font-extrabold uppercase tracking-widest text-placeholder">
        Intensidade
      </Text>
      <View className="h-[1.625rem] flex-1 flex-row items-end gap-[0.1875rem]">
        {bars.map((magnitude, index) => (
          <View
            // A posição é a identidade: a barra 3 é sempre a terceira leitura mais antiga.
            // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa na janela de leituras
            key={index}
            className={cn(
              'flex-1 rounded-[0.25rem]',
              isHighSample(magnitude) ? 'bg-primary' : 'bg-glass-strong'
            )}
            style={{ height: `${Math.round(barHeight(magnitude) * 100)}%` }}
          />
        ))}
      </View>
      <Text className="shrink-0 text-[0.6875rem] font-extrabold uppercase text-primary-text">
        {intensity.level}
      </Text>
    </Vidro>
  );
}
