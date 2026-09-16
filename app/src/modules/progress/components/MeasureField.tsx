import { filtrarEntradaNumerica } from '@elevapro/shared';
import { Text, TextInput, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * Um campo numérico do formulário de medida: rótulo, pílula de vidro com o número e
 * a unidade à direita.
 *
 *     rótulo 11,5 em label2, 6 acima; pílula de 48, raio 16; número 15 / 700; unidade 12
 *
 * Guarda o texto como foi digitado: com a vírgula do teclado Android, o número só é
 * lido ao salvar (`parseMeasurementForm`).
 *
 * @example <MeasureField label="Peso" unit="kg" value={peso} onChange={setPeso} />
 */
interface MeasureFieldProps {
  label: string;
  unit: string;
  value: string;
  onChange: (text: string) => void;
  invalid?: boolean;
}

export function MeasureField({ label, unit, value, onChange, invalid = false }: MeasureFieldProps) {
  const cores = useCores();
  return (
    <View className="min-w-0 flex-1">
      <Text
        className={cn(
          'mb-1.5 text-[0.71875rem]',
          invalid ? 'text-texto-perigo' : 'text-muted-foreground'
        )}
      >
        {label}
      </Text>
      <Vidro
        classeExterna="rounded-lg"
        className={cn(
          'h-12 flex-row items-center rounded-lg px-3.5',
          invalid ? 'border-perigo' : null
        )}
      >
        <TextInput
          value={value}
          onChangeText={(text) => onChange(filtrarEntradaNumerica(text))}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={cores.placeholder}
          accessibilityLabel={`${label}, em ${unit}`}
          className="min-w-0 flex-1 text-[0.9375rem] font-bold text-foreground"
        />
        <Text className="text-[0.75rem] font-semibold text-muted-foreground">{unit}</Text>
      </Vidro>
    </View>
  );
}
