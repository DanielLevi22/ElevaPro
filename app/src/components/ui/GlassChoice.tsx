import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { Vidro } from './Vidro';

/**
 * A opção de escolha única do kit: cartão de vidro com ícone num quadrado, título,
 * linha de apoio e o círculo de marcação à direita. É o "Tipo de acompanhamento"
 * do cadastro e o "Ponto de partida" da criação de treino e de dieta.
 *
 * @example
 * <GlassChoice icon="sparkles" title="Sugestão da IA" sub="Baseada na anamnese" active onPress={pick} />
 */
interface GlassChoiceProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** O O2 do onboarding não tem: o objetivo se explica pelo título. */
  sub?: string;
  active: boolean;
  onPress: () => void;
}

const ICON_SIZE = 17;
const MARK_SIZE = 19;

export function GlassChoice({ icon, title, sub, active, onPress }: GlassChoiceProps) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
    >
      <Vidro
        classeExterna="mb-[0.5625rem]"
        className={cn(
          'flex-row items-center gap-3 p-[0.8125rem]',
          active ? 'border-primary/50' : null
        )}
      >
        <View
          className={cn(
            'h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.6875rem]',
            active ? 'bg-primary' : 'bg-glass-strong'
          )}
        >
          <Ionicons
            name={icon}
            size={escalar(ICON_SIZE)}
            color={active ? cores.primaryForeground : cores.mutedForeground}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.84375rem] font-bold text-foreground">{title}</Text>
          {sub ? <Text className="text-[0.71875rem] text-muted-foreground">{sub}</Text> : null}
        </View>
        <Ionicons
          name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={escalar(MARK_SIZE)}
          color={active ? cores.primaryText : cores.placeholder}
        />
      </Vidro>
    </TouchableOpacity>
  );
}
