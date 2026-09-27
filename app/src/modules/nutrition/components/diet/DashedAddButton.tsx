import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * O "+ Adicionar …" tracejado do kit, no fim da lista (tela 18).
 *
 * @example <DashedAddButton label="Adicionar refeição" onPress={abrir} />
 */
interface DashedAddButtonProps {
  label: string;
  onPress: () => void;
  className?: string;
}

const PLUS_SIZE = 16;

export function DashedAddButton({ label, onPress, className }: DashedAddButtonProps) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      <Vidro classeExterna={className} className="border-dashed p-[0.8125rem]">
        <View className="flex-row items-center justify-center gap-2">
          <Ionicons name="add" size={escalar(PLUS_SIZE)} color={cores.primaryText} />
          <Text className="text-[0.8125rem] font-bold text-primary-text">{label}</Text>
        </View>
      </Vidro>
    </TouchableOpacity>
  );
}
