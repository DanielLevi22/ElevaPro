import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * As opções de resposta da anamnese no kit de vidro (#361): escolha única,
 * múltipla e sim ou não. O Aluno e o Praticante respondem com as mesmas peças —
 * antes eram duas cópias com desenhos diferentes, uma laranja e outra branca.
 *
 * A opção marcada ganha a borda e o fundo da primária, como a `GlassChoice`; o
 * estado vai junto para o leitor de tela, porque só a cor não diz qual é.
 */

/** O campo de texto e de número das duas anamneses, no mesmo vidro das opções. */
export const ANSWER_FIELD =
  'rounded-[0.9375rem] border border-glass-border bg-glass px-4 py-3.5 text-[0.9375rem] text-foreground';

const CHECK_SIZE = 12;

interface OptionProps {
  label: string;
  checked: boolean;
  kind: 'radio' | 'checkbox';
  onPress: () => void;
  className?: string;
}

function Option({ label, checked, kind, onPress, className }: OptionProps) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      className={cn(
        'flex-row items-center gap-3 rounded-[0.9375rem] border px-4 py-3.5',
        checked ? 'border-primary/55 bg-primary/10' : 'border-glass-border bg-glass',
        className
      )}
    >
      <View
        className={cn(
          'h-[1.1875rem] w-[1.1875rem] items-center justify-center border-2',
          kind === 'radio' ? 'rounded-full' : 'rounded-md',
          checked ? 'border-primary bg-primary' : 'border-placeholder'
        )}
      >
        {checked ? (
          <Ionicons name="checkmark" size={escalar(CHECK_SIZE)} color={cores.primaryForeground} />
        ) : null}
      </View>
      <Text
        className={cn(
          'flex-1 text-[0.875rem]',
          checked ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Escolha única (círculo) ou múltipla (caixa). Quem guarda a resposta decide o
 * que o toque faz: trocar a única ou ligar e desligar uma da lista.
 *
 * @example <ChoiceOptions options={opcoes} selected={[valor]} onToggle={responder} />
 */
export function ChoiceOptions({
  options,
  selected,
  multiple = false,
  onToggle,
}: {
  options: readonly string[];
  selected: readonly string[];
  multiple?: boolean;
  onToggle: (option: string) => void;
}) {
  return (
    <View className="gap-2">
      {options.map((option) => (
        <Option
          key={option}
          label={option}
          kind={multiple ? 'checkbox' : 'radio'}
          checked={selected.includes(option)}
          onPress={() => onToggle(option)}
        />
      ))}
    </View>
  );
}

/**
 * Sim ou não, lado a lado.
 *
 * @example <YesNoOptions value={resposta} onChange={responder} />
 */
export function YesNoOptions({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {([true, false] as const).map((option) => (
        <Option
          key={String(option)}
          label={option ? 'Sim' : 'Não'}
          kind="radio"
          checked={value === option}
          onPress={() => onChange(option)}
          className="flex-1"
        />
      ))}
    </View>
  );
}
