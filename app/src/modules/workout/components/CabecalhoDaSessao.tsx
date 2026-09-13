import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type IntensidadePercebida = 'Baixa' | 'Moderada' | 'Alta';

interface CabecalhoDaSessaoProps {
  exercicio: string;
  intensidade: IntensidadePercebida;
  onVoltar: () => void;
}

/**
 * Título da sessão de cardio e a intensidade que o acelerômetro estima ao vivo.
 *
 * A intensidade daqui é leitura de movimento, e nunca é gravada: o que vai para
 * o banco é a PSE que o aluno responde no fim, que é outra coisa (ver o
 * comentário de `perceived_exertion` em `workout_sessions`).
 */
export const CabecalhoDaSessao = memo(function CabecalhoDaSessao({
  exercicio,
  intensidade,
  onVoltar,
}: CabecalhoDaSessaoProps) {
  return (
    <View className="flex-row items-center justify-between mt-4 mb-6">
      <TouchableOpacity
        onPress={onVoltar}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <View className="items-center flex-1 mr-10">
        <Text className="text-zinc-400 text-xs font-sans uppercase tracking-widest">
          Sessão de Cardio
        </Text>
        <Text className="text-white text-2xl font-bold font-display text-center">{exercicio}</Text>
        <View className="bg-zinc-800 px-2 py-0.5 rounded-full mt-1">
          <Text className="text-zinc-400 text-[0.625rem] font-bold">
            Intensidade: <Text className="text-orange-500">{intensidade}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
});
