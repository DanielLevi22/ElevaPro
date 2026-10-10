import { View } from 'react-native';
import { Campo } from '@/components/ui/Campo';
import { cleanFreeText } from '../services/freeText';
import { Chips } from './Chips';

export const OTHER = 'Outro';

interface ChipsWithOtherProps {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
  /** O texto do "Outro", já limpo por `cleanFreeText`. */
  other: string;
  onOtherChange: (text: string) => void;
  otherLabel: string;
  otherPlaceholder: string;
}

/**
 * Os chips de uma pergunta com "Outro" no fim: marcado, abre um campo curto para
 * a pessoa escrever o que não está na lista.
 *
 * @example <ChipsWithOther options={SPORTS} selected={sports} onToggle={alternar} other={outro} onOtherChange={setOutro} otherLabel="Qual esporte?" otherPlaceholder="Ex.: natação" />
 */
export function ChipsWithOther({
  options,
  selected,
  onToggle,
  other,
  onOtherChange,
  otherLabel,
  otherPlaceholder,
}: ChipsWithOtherProps) {
  return (
    <>
      <Chips options={[...options, OTHER]} selected={selected} onToggle={onToggle} />
      {selected.includes(OTHER) ? (
        <View className="mt-3">
          <Campo
            rotulo={otherLabel}
            valor={other}
            onChange={(texto) => onOtherChange(cleanFreeText(texto))}
            placeholder={otherPlaceholder}
          />
        </View>
      ) : null}
    </>
  );
}

/**
 * A resposta da pergunta: o que foi marcado, com o "Outro" trocado pelo que a
 * pessoa escreveu (e fora, se ela não escreveu nada).
 *
 * @example withOther(['Corrida', 'Outro'], 'natação') // ['Corrida', 'natação']
 */
export function withOther(selected: readonly string[], other: string): string[] {
  const marked = selected.filter((item) => item !== OTHER);
  return selected.includes(OTHER) && other ? [...marked, other] : marked;
}
