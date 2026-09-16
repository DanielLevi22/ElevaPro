import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * A linha de atalho das telas de métricas.
 *
 *     glass, padding 13, gap 12, 9 entre linhas
 *     caixa de 32, raio 10, em glass-strong, com o ícone na primária
 *     título 13,5 / 600; subtítulo 11,5; seta 16 em label3
 *
 * Não é a `LinhaDeVidro`: lá a caixa é de 40 e tingida pela métrica, e o texto é
 * maior. Aqui o kit desenha a caixa neutra, porque os atalhos não são métricas.
 *
 * @example <ShortcutRow icon="scale-outline" title="Composição corporal" subtitle="Peso, gordura e massa magra" onPress={…} />
 */
interface ShortcutRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const ICON_SIZE = 15;
const CHEVRON_SIZE = 16;

export function ShortcutRow({ icon, title, subtitle, onPress }: ShortcutRowProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      className="mb-[0.5625rem]"
    >
      <Vidro className="flex-row items-center gap-3 p-[0.8125rem]">
        <View className="h-8 w-8 items-center justify-center rounded-[0.625rem] bg-glass-strong">
          <Ionicons name={icon} size={escalar(ICON_SIZE)} color={cores.primaryText} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.84375rem] font-semibold text-foreground">{title}</Text>
          <Text className="mt-px text-[0.71875rem] text-muted-foreground">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={escalar(CHEVRON_SIZE)} color={cores.placeholder} />
      </Vidro>
    </TouchableOpacity>
  );
}
