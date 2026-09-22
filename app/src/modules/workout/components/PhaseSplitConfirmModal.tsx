import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { useCores, useEscala } from '@/shared/design';

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
  const escalar = useEscala();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-veu-da-folha p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="w-[90%] max-w-[25rem]"
        >
          <View className="w-full items-center rounded-lg border border-border bg-background p-6">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Ionicons name="options" size={escalar(32)} color={cores.primaryText} />
            </View>

            <Text className="mb-2 text-center text-h2 font-bold text-foreground">
              Configurar treinos
            </Text>

            <Text className="mb-8 px-2 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
              {hasExistingWorkouts
                ? `Mudar a divisão para ${pendingSplit} irá excluir os treinos atuais.\nComo deseja prosseguir?`
                : `Divisão ${pendingSplit} selecionada.\nComo deseja criar seus treinos?`}
            </Text>

            <View className="w-full gap-2.5">
              <BotaoDeDestaque rotulo="Usar Co-Pilot" icone="sparkles" onPress={onUseAI} />

              <TouchableOpacity
                className="h-[2.625rem] w-full items-center justify-center rounded-md bg-muted"
                onPress={onEmptyWorkouts}
                accessibilityRole="button"
              >
                <Text className="text-[0.78125rem] font-extrabold uppercase tracking-wide text-foreground">
                  Treinos vazios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-1 w-full items-center justify-center py-2"
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text className="text-[0.8125rem] font-semibold text-muted-foreground">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
