import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

interface PhaseSplitModalProps {
  visible: boolean;
  isGenerating: boolean;
  customSplit: string;
  onChangeCustomSplit: (value: string) => void;
  pendingSplit: string;
  splits: string[];
  onClose: () => void;
  onSelectSplit: (split?: string) => void;
}

/** A divisão de treino da fase — modal de vidro com input livre e seleção rápida. */
export function PhaseSplitModal({
  visible,
  isGenerating,
  customSplit,
  onChangeCustomSplit,
  pendingSplit,
  splits,
  onClose,
  onSelectSplit,
}: PhaseSplitModalProps) {
  const cores = useCores();
  const escalar = useEscala();
  const fechar = () => {
    if (!isGenerating) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fechar}>
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-veu-da-folha p-6"
        activeOpacity={1}
        onPress={fechar}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} className="w-full">
          <View className="relative rounded-lg border border-border bg-background p-6">
            <TouchableOpacity className="absolute right-3.5 top-3.5 z-10 p-2" onPress={fechar}>
              <Ionicons name="close" size={escalar(22)} color={cores.mutedForeground} />
            </TouchableOpacity>

            <Text className="mb-2 mt-2 text-center text-h2 font-bold text-foreground">
              Divisão de treino
            </Text>

            {isGenerating ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color={cores.primary} />
                <Text className="mt-4 text-center text-[0.8125rem] text-muted-foreground">
                  Gerando treinos para a divisão...
                </Text>
                <Text className="mt-2 text-center text-legenda text-placeholder">
                  Isso pode levar alguns segundos.
                </Text>
              </View>
            ) : (
              <>
                <Text className="mb-6 text-center text-[0.8125rem] text-muted-foreground">
                  Cada letra representa um treino. Ex: ABC = Treino A, B e C
                </Text>

                <View className="mb-4">
                  <Text className="mb-2 text-legenda font-bold uppercase tracking-wide text-placeholder">
                    Divisão customizada
                  </Text>
                  <View className="flex-row gap-2">
                    <Vidro classeExterna="flex-1" className="h-12 justify-center rounded-md px-3.5">
                      <TextInput
                        value={customSplit}
                        onChangeText={(text) => onChangeCustomSplit(text.toUpperCase())}
                        placeholder="Ex: ABCD"
                        placeholderTextColor={cores.placeholder}
                        maxLength={10}
                        autoCapitalize="characters"
                        className="text-[1.0625rem] font-bold text-foreground"
                      />
                    </Vidro>
                    <TouchableOpacity
                      className="h-12 w-12 items-center justify-center rounded-md bg-primary"
                      onPress={() => onSelectSplit()}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar divisão customizada"
                    >
                      <Ionicons
                        name="checkmark"
                        size={escalar(22)}
                        color={cores.primaryForeground}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="mb-3 text-legenda font-bold uppercase tracking-wide text-placeholder">
                  Seleção rápida
                </Text>
                <View className="mb-1 flex-row flex-wrap justify-center gap-2">
                  {splits.map((split) => (
                    <TouchableOpacity
                      key={split}
                      onPress={() => onSelectSplit(split)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: pendingSplit === split }}
                    >
                      <Chip tom={pendingSplit === split ? 'destaque' : 'neutro'}>{split}</Chip>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
