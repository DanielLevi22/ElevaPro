import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { CaixaDeIcone } from './CaixaDeIcone';

interface BeforeAfterRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  before: string;
  after: string;
  /** O selo à direita: "0 kcal", "+80 kcal", "estimativa". */
  badge: string;
  /** Sem ele a linha só mostra: o ajuste proposto do check-in não se toca. */
  onPress?: () => void;
  disabled?: boolean;
  first?: boolean;
}

const ARROW_SIZE = 12;

/**
 * A linha de ajuste do kit (`AntesDepois` no desenho): o que é hoje riscado, a
 * seta e o que passa a ser, com o efeito à direita. Com `onPress`, toque aplica.
 *
 * @example <BeforeAfterRow icon="repeat" title="Trocar um alimento" before="Frango" after="Tilápia" badge="0 kcal" onPress={trocar} />
 */
export function BeforeAfterRow({
  icon,
  title,
  before,
  after,
  badge,
  onPress,
  disabled = false,
  first = false,
}: BeforeAfterRowProps) {
  const cores = useCores();
  const escalar = useEscala();
  const Linha = onPress ? TouchableOpacity : View;
  return (
    <Linha
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}: de ${before} para ${after}`}
      accessibilityState={onPress ? { disabled } : undefined}
      className={cn(
        'flex-row items-start gap-3 py-[0.6875rem]',
        !first && 'border-t border-glass-border',
        disabled && 'opacity-50'
      )}
    >
      <CaixaDeIcone icon={icon} tom="marca" tamanho="bloco" />
      <View className="min-w-0 flex-1">
        <Text className="text-[0.84375rem] font-bold text-foreground">{title}</Text>
        <View className="mt-[0.1875rem] flex-row flex-wrap items-center gap-1.5">
          <Text className="text-[0.71875rem] text-placeholder line-through">{before}</Text>
          <Ionicons name="arrow-forward" size={escalar(ARROW_SIZE)} color={cores.placeholder} />
          <Text className="text-[0.71875rem] font-semibold text-foreground">{after}</Text>
        </View>
      </View>
      <Text className="rounded-full bg-glass-strong px-2 py-1 font-mono text-[0.65625rem] font-bold text-foreground">
        {badge}
      </Text>
    </Linha>
  );
}

export type { BeforeAfterRowProps };
