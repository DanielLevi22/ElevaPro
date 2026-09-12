import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { escala, useCores } from '@/shared/design';
import { Button } from './Button';

/**
 * Diálogo de confirmação: ícone, título, mensagem e duas ações.
 *
 * É o `Dialog` do design system na forma que o mobile usa. Ficou chapado: o
 * cabeçalho tinha gradiente de quatro cores escritas à mão, e o desenho não usa
 * gradiente em superfície — a separação é a borda, e o brilho fica reservado ao
 * primário.
 */
interface ConfirmModalProps {
  visible: boolean;
  /** Chamado sempre que o modal sai de cena — pelos dois botões. */
  onClose: () => void;
  onConfirm: () => void;
  /**
   * Ação do botão secundário. Sem ela o secundário apenas fecha, que é o caso
   * comum de "Cancelar". Existe para quando o secundário é uma escolha de
   * verdade — "Sair" contra "Compartilhar" ao fim do treino —, porque aí não dá
   * para inferir a intenção a partir de `onClose`.
   */
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

const ICONE = {
  danger: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
  success: 'checkmark-circle',
} as const;

/** Classe literal por tipo: Tailwind só gera o que aparece escrito no fonte. */
const HALO = {
  danger: 'bg-destructive/10',
  warning: 'bg-warning/10',
  info: 'bg-secondary/10',
  success: 'bg-success/10',
} as const;

const VARIANTE_DA_ACAO = {
  danger: 'destructive',
  warning: 'primary',
  info: 'primary',
  success: 'primary',
} as const;

const DURACAO_DE_ENTRADA = 200;
const DURACAO_DE_SAIDA = 150;

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
}: ConfirmModalProps) {
  const cores = useCores();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: DURACAO_DE_ENTRADA });
      scale.value = withSpring(1, { damping: 15 });
      return;
    }
    opacity.value = withTiming(0, { duration: DURACAO_DE_SAIDA });
    scale.value = withTiming(0.8, { duration: DURACAO_DE_SAIDA });
  }, [visible, opacity, scale]);

  const estiloDoFundo = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const estiloDoCartao = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View style={estiloDoFundo} className="absolute inset-0 bg-black/60" />

        <Animated.View
          style={estiloDoCartao}
          className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card"
        >
          <View className={cn('items-center border-b border-border py-8', HALO[type])}>
            <View className="h-20 w-20 items-center justify-center rounded-full border border-border bg-background">
              <Ionicons
                name={ICONE[type]}
                size={escala.texto.display}
                color={corDoTipo(type, cores)}
              />
            </View>
          </View>

          <View className="items-center p-8">
            <Text className="mb-2 text-center text-h1 font-extrabold tracking-tight text-foreground">
              {title}
            </Text>
            <Text className="mb-8 text-center text-corpo leading-normal text-muted-foreground">
              {message}
            </Text>

            <View className="w-full gap-3">
              <Button
                label={confirmText}
                variant={VARIANTE_DA_ACAO[type]}
                fullWidth
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              />
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  onCancel?.();
                  onClose();
                }}
                className="w-full items-center justify-center rounded-2xl bg-muted py-4"
              >
                <Text className="text-corpo font-semibold text-foreground">{cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** O ícone não aceita classe: precisa da cor já resolvida. */
function corDoTipo(
  type: NonNullable<ConfirmModalProps['type']>,
  cores: ReturnType<typeof useCores>
): string {
  if (type === 'danger') return cores.destructive;
  if (type === 'warning') return cores.warning;
  if (type === 'success') return cores.success;
  return cores.secondary;
}

export type { ConfirmModalProps };
