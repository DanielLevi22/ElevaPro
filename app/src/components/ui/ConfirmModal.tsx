import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 150 });
    }
  }, [visible, opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'trash' as const,
          color: '#F87171',
          gradient: ['#DC2626', '#EF4444'] as const,
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
        };
      case 'success':
        return {
          icon: 'trophy' as const,
          color: '#34D399', // Emerald 400
          gradient: ['#059669', '#34D399'] as const,
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: '#FBBF24',
          gradient: ['#D97706', '#F59E0B'] as const,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
        };
      default:
        return {
          icon: 'help-circle' as const,
          color: '#60A5FA',
          gradient: ['#2563EB', '#3B82F6'] as const,
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
        };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/80 px-6">
        <Animated.View style={[containerStyle]} className="absolute inset-0 bg-black/40" />

        <Animated.View
          style={[contentStyle]}
          className="w-full max-w-sm bg-zinc-950 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl"
        >
          {/* Header Icon Area */}
          <View className={`items-center py-8 ${config.bg} border-b border-white/5`}>
            <View className="w-20 h-20 rounded-full bg-black/40 items-center justify-center border border-white/10 shadow-lg">
              <Ionicons name={config.icon} size={40} color={config.color} />
            </View>
          </View>

          {/* Content */}
          <View className="p-8 items-center">
            <Text className="text-white text-2xl font-extrabold font-display text-center mb-2">
              {title}
            </Text>
            <Text className="text-zinc-500 text-center font-sans mb-8 leading-relaxed">
              {message}
            </Text>

            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
                activeOpacity={0.9}
                className="w-full"
              >
                <LinearGradient
                  colors={config.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-4 rounded-2xl items-center justify-center shadow-lg"
                >
                  <Text className="text-white font-bold text-base font-display uppercase tracking-wider">
                    {confirmText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onCancel?.();
                  onClose();
                }}
                activeOpacity={0.7}
                className="w-full py-4 rounded-2xl bg-zinc-900 border border-white/5 items-center justify-center"
              >
                <Text className="text-zinc-400 font-bold text-base font-display uppercase tracking-wider">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
