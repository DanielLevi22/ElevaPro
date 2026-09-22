import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useCores } from '@/shared/design';

interface PhaseSplitConfirmModalProps {
  visible: boolean;
  pendingSplit: string;
  hasExistingWorkouts: boolean;
  onClose: () => void;
  onUseAI: () => void;
  onEmptyWorkouts: () => void;
}

/**
 * Depois de escolher a divisão: treinos vazios pra montar na mão, ou o
 * Co-Pilot — que, se já existem treinos na fase, os substitui.
 */
export function PhaseSplitConfirmModal({
  visible,
  pendingSplit,
  hasExistingWorkouts,
  onClose,
  onUseAI,
  onEmptyWorkouts,
}: PhaseSplitConfirmModalProps) {
  const cores = useCores();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-center items-center p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="w-[90%] max-w-[25rem]"
        >
          <View className="bg-zinc-900 w-full rounded-[1.5rem] p-6 border border-zinc-800 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-orange-500/10 items-center justify-center border border-orange-500/20 mb-5">
              <Ionicons name="options" size={32} color={cores.primary} />
            </View>

            <Text className="text-white text-xl font-extrabold mb-2 text-center font-display">
              Configurar Treinos
            </Text>

            <Text className="text-zinc-400 text-center font-sans mb-8 leading-relaxed text-sm px-2">
              {hasExistingWorkouts
                ? `Mudar a divisão para ${pendingSplit} irá excluir os treinos atuais.\nComo deseja prosseguir?`
                : `Divisão ${pendingSplit} selecionada.\nComo deseja criar seus treinos?`}
            </Text>

            <View className="w-full gap-3">
              <TouchableOpacity onPress={onUseAI} activeOpacity={0.9} className="w-full">
                <LinearGradient
                  colors={[cores.primary, cores.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-4 rounded-xl items-center justify-center shadow-lg"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color={cores.primaryForeground}
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-bold text-base font-display uppercase tracking-wider">
                      Usar Co-Pilot
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 items-center justify-center"
                onPress={onEmptyWorkouts}
              >
                <Text className="text-white font-bold text-base font-display uppercase tracking-wider">
                  Treinos Vazios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full py-3 items-center justify-center mt-2"
                onPress={onClose}
              >
                <Text className="text-zinc-500 font-bold text-sm">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
