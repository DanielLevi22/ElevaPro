import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCores } from '@/shared/design';

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
  const fechar = () => {
    if (!isGenerating) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fechar}>
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-center items-center p-6"
        activeOpacity={1}
        onPress={fechar}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View className="bg-zinc-900 w-full rounded-2xl p-6 border border-zinc-800 relative">
            <TouchableOpacity className="absolute top-4 right-4 z-10 p-2" onPress={fechar}>
              <Ionicons name="close" size={24} color={cores.mutedForeground} />
            </TouchableOpacity>

            <Text className="text-white text-xl font-bold mb-2 text-center font-display mt-2">
              Divisão de Treino
            </Text>

            {isGenerating ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={cores.primary} />
                <Text className="text-zinc-400 text-sm mt-4 text-center">
                  Gerando treinos para a divisão...
                </Text>
                <Text className="text-zinc-600 text-xs mt-2 text-center">
                  Isso pode levar alguns segundos.
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-zinc-400 text-sm mb-6 text-center">
                  Cada letra representa um treino. Ex: ABC = Treino A, B e C
                </Text>

                <View className="mb-4">
                  <Text className="text-zinc-400 text-xs mb-2 font-semibold">
                    DIVISÃO CUSTOMIZADA
                  </Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      value={customSplit}
                      onChangeText={(text) => onChangeCustomSplit(text.toUpperCase())}
                      placeholder="Ex: ABCD"
                      placeholderTextColor={cores.mutedForeground}
                      maxLength={10}
                      autoCapitalize="characters"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold text-lg"
                    />
                    <TouchableOpacity
                      className="bg-orange-500 px-6 py-3 rounded-xl items-center justify-center"
                      onPress={() => onSelectSplit()}
                    >
                      <Ionicons name="checkmark" size={24} color={cores.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-zinc-400 text-xs mb-3 font-semibold">SELEÇÃO RÁPIDA</Text>
                <View className="flex-row flex-wrap justify-center gap-3 mb-4">
                  {splits.map((split) => (
                    <TouchableOpacity
                      key={split}
                      className={`px-6 py-4 rounded-xl border ${
                        pendingSplit === split
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                      onPress={() => onSelectSplit(split)}
                    >
                      <Text
                        className={`font-bold text-lg ${
                          pendingSplit === split ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        {split}
                      </Text>
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
