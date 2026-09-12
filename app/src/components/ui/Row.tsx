import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * A linha da lista grouped-inset: ícone em caixa, título, subtítulo e um espaço
 * à direita.
 *
 * É a mesma forma em três papéis, e por isso um componente só:
 *
 * | papel      | como se pede            | direita          |
 * |------------|-------------------------|------------------|
 * | escolha    | `selected`              | marca de seleção |
 * | navegação  | `chevron`               | seta             |
 * | ajuste     | `trailing={<Switch/>}`  | o que vier       |
 *
 * `chevron` existe como booleano, em vez de a tela passar o ícone, para que a
 * cor da seta não vire hexadecimal escrito à mão em cada call site.
 *
 * @example
 * <Row icon="person-outline" title="Perfil" chevron onPress={irParaPerfil} />
 * <Row icon="barbell" title="Sou Especialista" sub="Personal trainer"
 *   selected={tipo === 'specialist'} onPress={() => setTipo('specialist')} />
 */
interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress?: () => void;
  selected?: boolean;
  chevron?: boolean;
  trailing?: ReactNode;
}

const TAMANHO_DO_ICONE = 19;
const TAMANHO_DA_MARCA = 21;

export function Row({ icon, title, sub, onPress, selected, chevron, trailing }: RowProps) {
  const cores = useCores();
  const ehEscolha = selected !== undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole={ehEscolha ? 'radio' : 'button'}
      accessibilityState={ehEscolha ? { selected } : undefined}
      className={cn(
        'flex-row items-center gap-3.5 px-4 py-3',
        selected ? 'bg-primary/10' : 'bg-transparent'
      )}
    >
      <View
        className={cn(
          'h-[38px] w-[38px] items-center justify-center rounded-sm',
          selected ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        <Ionicons
          name={icon}
          size={TAMANHO_DO_ICONE}
          color={selected ? cores.primaryText : cores.mutedForeground}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-rotulo tracking-tight text-foreground">{title}</Text>
        {sub ? <Text className="mt-px text-legenda text-muted-foreground">{sub}</Text> : null}
      </View>

      {trailing}
      {selected ? (
        <Ionicons name="checkmark-circle" size={TAMANHO_DA_MARCA} color={cores.primaryText} />
      ) : null}
      {chevron ? (
        <Ionicons name="chevron-forward" size={TAMANHO_DO_ICONE} color={cores.placeholder} />
      ) : null}
    </TouchableOpacity>
  );
}

export type { RowProps };
