import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Uma aba do kit: ícone de 23 e rótulo de 10 embaixo, na cor primária de texto
 * quando ativa e no tom terciário quando não.
 *
 * O ícone é do Lucide, como no kit: o traço fino de 1,5 engrossa para 2 na aba
 * ativa (`.tabitem.on svg.lucide { stroke-width: 2px }`), em vez de trocar por uma
 * versão preenchida.
 *
 * @example
 * <ItemDaAba rotulo="Treinos" Icone={Dumbbell} ativo onPress={abrir} />
 */
interface ItemDaAbaProps {
  rotulo: string;
  Icone: LucideIcon;
  ativo: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TAMANHO_DO_ICONE = 23;
const TRACO = 1.5;
const TRACO_ATIVO = 2;

export const ItemDaAba = memo(function ItemDaAba({
  rotulo,
  Icone,
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
      <Icone
        size={escalar(TAMANHO_DO_ICONE)}
        strokeWidth={ativo ? TRACO_ATIVO : TRACO}
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
