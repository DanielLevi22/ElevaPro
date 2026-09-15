import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * O bloco centrado do cardio (`MetricTile` do kit): ícone tingido, número com a
 * unidade na mesma linha de base e a legenda em caixa alta.
 *
 * Não é o `BlocoDeMetrica` da tela inicial, alinhado à esquerda e com o ícone
 * numa caixa: aqui os blocos vão de três em três, estreitos, e o kit centra tudo.
 *
 * @example
 * <MetricTile icon="flame" value="164" unit="kcal" label="Queima" tone="primary" />
 */
export type MetricTone = 'primary' | 'heart' | 'pace' | 'cadence' | 'muted';

interface MetricTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit?: string;
  label: string;
  tone?: MetricTone;
}

const ICON_SIZE = 17;

/** A cor do ícone por tom: no claro, o tom escuro que passa AA sobre o vidro. */
export function useToneColor(tone: MetricTone): string {
  const cores = useCores();
  const colors: Record<MetricTone, string> = {
    primary: cores.primaryText,
    heart: cores.textoBatimento,
    pace: cores.textoRitmo,
    cadence: cores.textoCadencia,
    muted: cores.mutedForeground,
  };
  return colors[tone];
}

export const MetricTile = memo(function MetricTile({
  icon,
  value,
  unit,
  label,
  tone = 'primary',
}: MetricTileProps) {
  const escalar = useEscala();
  const color = useToneColor(tone);

  return (
    <Vidro
      classeExterna="flex-1"
      className="items-center gap-1.5 px-2 py-[0.8125rem]"
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <Ionicons name={icon} size={escalar(ICON_SIZE)} color={color} />
      <View className="flex-row items-baseline gap-0.5">
        <Text className="font-display-black text-[1.25rem] tracking-tight text-foreground">
          {value}
        </Text>
        {unit ? <Text className="text-[0.59375rem] font-bold text-placeholder">{unit}</Text> : null}
      </View>
      <Text
        numberOfLines={1}
        className="text-[0.59375rem] font-bold uppercase tracking-widest text-placeholder"
      >
        {label}
      </Text>
    </Vidro>
  );
});
