import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { Button } from './Button';

/**
 * Aviso de uma ação só: ícone, título, mensagem e um botão para fechar.
 *
 * É o que o `appAlert` renderiza, então ele aparece em qualquer tela do app —
 * e é por isso que a cor dele importa mais que a média. As quatro cores de tom
 * e os quatro gradientes estavam escritos à mão, o que deixava este aviso com
 * texto claro sobre superfície clara no tema claro, em todo o app de uma vez.
 *
 * Perdeu o gradiente no botão junto: o desenho não usa gradiente em superfície,
 * e o brilho fica reservado ao primário. Mesmo tratamento do `ConfirmModal`.
 */
export type StatusModalType = 'success' | 'error' | 'warning' | 'info';

interface StatusModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: StatusModalType;
  buttonText?: string;
}

const ICONE = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
} as const;

/** Classe literal por tom: Tailwind só gera o que aparece escrito no fonte. */
const HALO = {
  success: 'bg-success/10 border-success/30',
  error: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-warning/10 border-warning/30',
  info: 'bg-secondary/10 border-secondary/30',
} as const;

const VARIANTE_DA_ACAO = {
  success: 'primary',
  error: 'destructive',
  warning: 'primary',
  info: 'primary',
} as const;

const TAMANHO_DO_ICONE = 64;
const DURACAO_DE_ENTRADA = 200;
const DURACAO_DE_SAIDA = 150;

export function StatusModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Entendi',
}: StatusModalProps) {
  const cores = useCores();
  const escalar = useEscala();
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

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        {/*
          O véu é escuro nos dois temas de propósito: o iOS escurece o conteúdo
          atrás de um modal independentemente da aparência do sistema. É a única
          cor deste arquivo que não vem de token, e é assim que deve ser.
        */}
        <Animated.View style={estiloDoFundo} className="absolute inset-0 bg-black/60" />

        <Animated.View
          style={estiloDoCartao}
          className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card"
        >
          <View className={cn('items-center border-b py-8', HALO[type])}>
            <Ionicons
              name={ICONE[type]}
              size={escalar(TAMANHO_DO_ICONE)}
              color={corDoTom(type, cores)}
            />
          </View>

          <View className="items-center p-6">
            <Text className="mb-2 text-center text-h2 font-bold tracking-tight text-foreground">
              {title}
            </Text>
            <Text className="mb-8 text-center text-corpo leading-normal text-muted-foreground">
              {message}
            </Text>

            <Button
              label={buttonText}
              variant={VARIANTE_DA_ACAO[type]}
              fullWidth
              onPress={onClose}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** O ícone não aceita classe: precisa da cor já resolvida. */
function corDoTom(type: StatusModalType, cores: ReturnType<typeof useCores>): string {
  if (type === 'success') return cores.success;
  if (type === 'error') return cores.destructive;
  if (type === 'warning') return cores.warning;
  return cores.secondary;
}
