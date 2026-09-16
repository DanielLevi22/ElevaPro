import type { MeasurementSource } from '@elevapro/shared';
import { TouchableOpacity, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { chipDate, SOURCE_LABEL } from './measurementLabels';

/**
 * Os chips de cima das telas de corpo: quem mediu e a data do registro aberto.
 *
 *     linha com gap 7, 14 abaixo do cabeçalho; a origem em destaque, a data neutra
 *
 * Com as duas origens, tocar na origem troca a série: fita e declaração nunca se
 * misturam, então a troca é a única forma de ver a outra.
 *
 * @example <SourceChips source="self" sources={['self', 'specialist']} date={latest.assessed_at} onToggle={…} />
 */
interface SourceChipsProps {
  source: MeasurementSource;
  sources: readonly MeasurementSource[];
  date: string;
  onToggle: (source: MeasurementSource) => void;
}

export function SourceChips({ source, sources, date, onToggle }: SourceChipsProps) {
  const other = sources.find((item) => item !== source);
  const label = SOURCE_LABEL[source];
  return (
    <View className="mt-3.5 flex-row flex-wrap gap-[0.4375rem]">
      {other ? (
        <TouchableOpacity
          onPress={() => onToggle(other)}
          accessibilityRole="button"
          accessibilityLabel={`${label}. Tocar para ver: ${SOURCE_LABEL[other]}`}
        >
          <Chip tom="destaque" icone="swap-horizontal">
            {label}
          </Chip>
        </TouchableOpacity>
      ) : (
        <Chip tom="destaque">{label}</Chip>
      )}
      <Chip>{chipDate(date)}</Chip>
    </View>
  );
}
