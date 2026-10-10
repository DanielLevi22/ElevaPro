import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { CaixaDeIcone } from './CaixaDeIcone';

interface AntesDepoisProps {
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  antes: string;
  depois: string;
  /** O selo à direita: "0 kcal", "meta recalculada", "estimativa". */
  selo: string;
  onPress: () => void;
  disabled?: boolean;
  primeira?: boolean;
}

const SETA = 12;

/**
 * A linha de ajuste do kit (`AntesDepois`): o que é hoje riscado, a seta e o
 * que passa a ser, com o efeito à direita. Toque aplica.
 *
 * @example <AntesDepois icon="repeat" titulo="Trocar um alimento" antes="Frango" depois="Tilápia" selo="0 kcal" onPress={trocar} />
 */
export function AntesDepois({
  icon,
  titulo,
  antes,
  depois,
  selo,
  onPress,
  disabled = false,
  primeira = false,
}: AntesDepoisProps) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: de ${antes} para ${depois}`}
      accessibilityState={{ disabled }}
      className={cn(
        'flex-row items-start gap-3 py-[0.6875rem]',
        !primeira && 'border-t border-glass-border',
        disabled && 'opacity-50'
      )}
    >
      <CaixaDeIcone icon={icon} tom="marca" tamanho="bloco" />
      <View className="min-w-0 flex-1">
        <Text className="text-[0.84375rem] font-bold text-foreground">{titulo}</Text>
        <View className="mt-[0.1875rem] flex-row flex-wrap items-center gap-1.5">
          <Text className="text-[0.71875rem] text-placeholder line-through">{antes}</Text>
          <Ionicons name="arrow-forward" size={escalar(SETA)} color={cores.placeholder} />
          <Text className="text-[0.71875rem] font-semibold text-foreground">{depois}</Text>
        </View>
      </View>
      <Text className="rounded-full bg-glass-strong px-2 py-1 font-mono text-[0.65625rem] font-bold text-foreground">
        {selo}
      </Text>
    </TouchableOpacity>
  );
}

export type { AntesDepoisProps };
