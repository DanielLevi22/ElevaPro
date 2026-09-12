import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { Text, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * Campo de texto, no desenho do app.
 *
 * No desenho ele não tem borda nem fundo próprios: é uma **linha do `Group`**,
 * com 50 de altura, um ícone opcional à esquerda e um espaço à direita para
 * ação — mostrar a senha, limpar o campo. Quem dá a moldura é o `Group`.
 *
 * `label` e `error` continuam existindo para uso solto, fora de um `Group`, e
 * usam a mesma tipografia que o `Group` dá ao cabeçalho e ao rodapé — assim as
 * duas formas de usar não divergem de aparência.
 *
 * @example
 * <Group>
 *   <Input icon="mail" placeholder="seu@email.com" keyboardType="email-address" />
 *   <Input icon="lock-closed" placeholder="••••••••" senha />
 * </Group>
 */
interface InputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: ReactNode;
  label?: string;
  error?: string;
  /**
   * Campo de senha: esconde o texto e mostra o olho de revelar.
   *
   * O estado de visibilidade mora aqui, e não na tela, porque ele é do campo e
   * de mais ninguém — a tela de cadastro tem dois campos de senha e cada um
   * revela o seu. Era o terceiro call site a repetir o mesmo `useState` e o
   * mesmo `TouchableOpacity`.
   */
  senha?: boolean;
  className?: string;
}

const TAMANHO_DO_ICONE = 19;
const TAMANHO_DO_OLHO = 18;

export function Input({
  icon,
  trailing,
  label,
  error,
  senha = false,
  className,
  ...props
}: InputProps) {
  const cores = useCores();
  const [visivel, setVisivel] = useState(false);

  return (
    <View className={className}>
      {label ? (
        <Text className="px-4 pb-[7px] text-legenda uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
      ) : null}

      <View className="h-[50px] flex-row items-center gap-3 px-4">
        {icon ? (
          <Ionicons name={icon} size={TAMANHO_DO_ICONE} color={cores.mutedForeground} />
        ) : null}
        <TextInput
          placeholderTextColor={cores.placeholder}
          className={cn(
            'flex-1 tracking-tight text-corpo text-foreground',
            props.editable === false && 'opacity-60'
          )}
          {...props}
          // Depois do spread, e não antes: com `senha`, quem manda no sigilo é
          // o olho deste componente. Um `secureTextEntry` vindo do call site
          // venceria o toggle e o olho viraria enfeite.
          secureTextEntry={senha ? !visivel : props.secureTextEntry}
        />
        {senha ? (
          <TouchableOpacity
            onPress={() => setVisivel((atual) => !atual)}
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons
              name={visivel ? 'eye-off' : 'eye'}
              size={TAMANHO_DO_OLHO}
              color={cores.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
        {trailing}
      </View>

      {error ? (
        <Text className="px-4 pt-[7px] text-legenda leading-[1.35] text-destructive">{error}</Text>
      ) : null}
    </View>
  );
}

export type { InputProps };
