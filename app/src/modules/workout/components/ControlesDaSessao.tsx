import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ControlesDaSessaoProps {
  /** Verdadeiro só antes do primeiro início: depois disso há o que retomar. */
  naoComecou: boolean;
  emAndamento: boolean;
  onIniciar: () => void;
  onPausar: () => void;
  onFinalizar: () => void;
}

const GRADIENTE_INICIAR = ['#FF6B35', '#FF2E63'] as const;

/** Iniciar, pausar, retomar e finalizar a sessão. */
export const ControlesDaSessao = memo(function ControlesDaSessao({
  naoComecou,
  emAndamento,
  onIniciar,
  onPausar,
  onFinalizar,
}: ControlesDaSessaoProps) {
  if (naoComecou) {
    return (
      <View className="mb-8">
        <TouchableOpacity onPress={onIniciar} activeOpacity={0.8} accessibilityRole="button">
          <LinearGradient
            colors={GRADIENTE_INICIAR}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-xl py-4 items-center justify-center"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="play" size={24} color="white" />
              <Text className="text-white text-lg font-bold font-display">INICIAR</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="flex-row gap-4">
        {emAndamento ? (
          <TouchableOpacity
            onPress={onPausar}
            accessibilityRole="button"
            className="flex-1 bg-zinc-800 py-5 rounded-2xl items-center justify-center border border-zinc-700"
          >
            <Ionicons name="pause" size={28} color="white" />
            <Text className="text-white font-bold mt-1">PAUSAR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onIniciar}
            accessibilityRole="button"
            className="flex-1 bg-emerald-600 py-5 rounded-2xl items-center justify-center"
          >
            <Ionicons name="play" size={28} color="white" />
            <Text className="text-white font-bold mt-1">RETOMAR</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onFinalizar}
          accessibilityRole="button"
          className="flex-1 bg-zinc-900 py-5 rounded-2xl items-center justify-center border border-zinc-800"
        >
          <Ionicons name="stop" size={28} color="#EF4444" />
          <Text className="text-red-500 font-bold mt-1">FINALIZAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
