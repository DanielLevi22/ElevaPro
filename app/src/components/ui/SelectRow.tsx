import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * Linha de escolha dentro de um `Group`: ícone em caixa, título, subtítulo e a
 * marca de selecionado à direita.
 *
 * É como o app desenhado pede o tipo de conta e os serviços do Specialist. Serve
 * tanto para escolha única quanto múltipla — quem decide isso é o call site, ao
 * controlar `selected`; a linha só mostra o estado.
 *
 * @example
 * <Group header="Tipo de conta">
 *   <SelectRow icon="barbell" title="Sou Especialista" sub="Personal trainer ou nutricionista"
 *     selected={tipo === 'specialist'} onPress={() => setTipo('specialist')} />
 * </Group>
 */
interface SelectRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  selected?: boolean;
  onPress: () => void;
}

const TAMANHO_DO_ICONE = 19;
const TAMANHO_DA_MARCA = 21;

export function SelectRow({ icon, title, sub, selected = false, onPress }: SelectRowProps) {
  const cores = useCores();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
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
        <Text className="text-rotulo font-semibold tracking-tight text-foreground">{title}</Text>
        {sub ? <Text className="mt-px text-legenda text-muted-foreground">{sub}</Text> : null}
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={TAMANHO_DA_MARCA} color={cores.primaryText} />
      ) : null}
    </TouchableOpacity>
  );
}
