import { filtrarEntradaNumerica } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores, useEscala } from '@/shared/design';

interface FieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  unit?: string;
  placeholder?: string;
  /** O formato esperado, com exemplo. Sem ele o campo está certo ou vazio. */
  error?: string;
  /** Teclado numérico com vírgula: idade, altura, peso. */
  numeric?: boolean;
}

const ERROR_ICON_SIZE = 14;
/** O halo do erro no kit: `tint(RED, 16)`. */
const ERROR_HALO = 0.16;

/**
 * O campo do kit (`Campo` no desenho): rótulo em mono, o valor grande em
 * display e a unidade à direita. Fora da faixa, a borda e o halo vermelhos e o
 * formato esperado embaixo.
 *
 * @example <Field label="Altura" value={altura} onChange={setAltura} unit="cm" numeric error={erros.height} />
 */
export function Field({
  label,
  value,
  onChange,
  unit,
  placeholder = '—',
  error,
  numeric = false,
}: FieldProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1.5 pl-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
        {label}
      </Text>
      <View
        className={cn(
          'h-[3.25rem] flex-row items-center gap-2 rounded-[0.875rem] border bg-glass px-3.5',
          error ? 'border-destructive' : 'border-glass-border'
        )}
        style={
          error
            ? { boxShadow: `0 0 0 3px ${comOpacidade(cores.destructive, ERROR_HALO)}` }
            : undefined
        }
      >
        <TextInput
          value={value}
          // O teclado numérico é dica: colar e teclado físico entram por fora dele.
          onChangeText={(text) => onChange(numeric ? filtrarEntradaNumerica(text) : text)}
          placeholder={placeholder}
          placeholderTextColor={cores.placeholder}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          accessibilityLabel={unit ? `${label} em ${unit}` : label}
          accessibilityHint={error}
          className="flex-1 font-display-black text-[1.25rem] tracking-tight text-hero"
        />
        {unit ? (
          <Text className="text-[0.78125rem] font-semibold text-placeholder">{unit}</Text>
        ) : null}
      </View>
      {error ? (
        <View className="mt-[0.4375rem] flex-row items-start gap-1.5">
          <Ionicons
            name="alert-circle-outline"
            size={escalar(ERROR_ICON_SIZE)}
            color={cores.destructive}
          />
          <Text className="flex-1 text-[0.71875rem] leading-[0.97rem] text-hero-secondary">
            <Text className="font-bold text-hero">Fora da faixa. </Text>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type { FieldProps };
