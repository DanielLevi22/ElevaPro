import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * A pílula de vidro das ações do kit: ícone na primária e rótulo curto —
 * "Novo treino", "Avaliação", "Visão do aluno".
 *
 * @example
 * <ActionPill icon="download-outline" label="Baixar treino" onPress={baixar} />
 */
interface ActionPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const ICON_SIZE = 14;

export function ActionPill({ icon, label, onPress }: ActionPillProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      <Vidro
        classeExterna="rounded-full"
        className="flex-row items-center gap-[0.4375rem] rounded-full px-[0.8125rem] py-2.5"
      >
        <Ionicons name={icon} size={escalar(ICON_SIZE)} color={cores.primaryText} />
        <Text className="text-[0.78125rem] font-bold text-foreground">{label}</Text>
      </Vidro>
    </TouchableOpacity>
  );
}
