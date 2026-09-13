import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Uma aba do kit: ícone de 23 e rótulo de 10 embaixo, na cor primária de texto
 * quando ativa e no tom terciário quando não.
 *
 * @example
 * <ItemDaAba rotulo="Treinos" icone="dumbbell" ativo onPress={abrir} />
 */
interface ItemDaAbaProps {
  rotulo: string;
  icone: keyof typeof MaterialCommunityIcons.glyphMap;
  ativo: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TAMANHO_DO_ICONE = 23;

export const ItemDaAba = memo(function ItemDaAba({
  rotulo,
  icone,
  ativo,
  onPress,
  onLongPress,
}: ItemDaAbaProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      hitSlop={10}
      className="flex-1 items-center gap-[0.3125rem]"
    >
      <MaterialCommunityIcons
        name={icone}
        size={escalar(TAMANHO_DO_ICONE)}
        color={ativo ? cores.primaryText : cores.placeholder}
      />
      <Text
        className={cn(
          'text-[0.625rem] tracking-tight',
          ativo ? 'font-bold text-primary-text' : 'font-semibold text-placeholder'
        )}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
});
