import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * O campo de formulário do kit (`Field`): rótulo em caixa alta em cima e a caixa
 * de 48 com o ícone à esquerda, no preenchimento de campo sobre o vidro.
 *
 * @example <FormField label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} />
 */
interface FormFieldProps
  extends Pick<
    TextInputProps,
    'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoComplete'
  > {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ICON_SIZE = 17;

export function FormField({ label, icon, ...input }: FormFieldProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="mb-3">
      <Text className="mb-1.5 pl-0.5 text-[0.65625rem] font-bold uppercase tracking-wider text-placeholder">
        {label}
      </Text>
      <View className="h-12 flex-row items-center gap-2.5 overflow-hidden rounded-[0.875rem] border border-glass-border px-3.5">
        <View className="absolute inset-0 bg-glass-strong opacity-60" />
        <Ionicons name={icon} size={escalar(ICON_SIZE)} color={cores.placeholder} />
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={cores.placeholder}
          className="min-w-0 flex-1 text-[0.90625rem] font-semibold text-foreground"
        />
      </View>
    </View>
  );
}
