import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import type { ChoiceProps } from './choiceProps';
import { Vidro } from './Vidro';

interface ChoiceTileProps extends ChoiceProps {
  icon: keyof typeof Ionicons.glyphMap;
}

const ICON_SIZE = 17;
const MARK_SIZE = 16;

/**
 * O bloco de escolha do kit (`ChoiceTile`): ícone num quadrado, o nome embaixo e
 * a marca no canto. Para escolhas com cara, como "onde você treina", lado a lado.
 *
 * @example <ChoiceTile icon="home-outline" label="Casa" selected={local === 'casa'} onPress={() => setLocal('casa')} />
 */
export function ChoiceTile({ icon, label, selected, onPress }: ChoiceTileProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected: selected }}
      accessibilityLabel={label}
      className="flex-1"
    >
      <Vidro
        className={cn('items-center gap-2 px-2.5 py-3', selected ? 'border-primary/50' : null)}
      >
        <View className="-mb-3.5 self-end">
          <Ionicons
            name={selected ? 'checkmark-circle-outline' : 'ellipse-outline'}
            size={escalar(MARK_SIZE)}
            color={selected ? cores.primaryText : cores.placeholder}
          />
        </View>
        <View
          className={cn(
            'h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.6875rem]',
            selected ? 'bg-primary' : 'bg-glass-strong'
          )}
        >
          <Ionicons
            name={icon}
            size={escalar(ICON_SIZE)}
            color={selected ? cores.primaryForeground : cores.mutedForeground}
          />
        </View>
        <Text className="text-[0.78125rem] font-bold text-hero">{label}</Text>
      </Vidro>
    </TouchableOpacity>
  );
}

export type { ChoiceTileProps };
