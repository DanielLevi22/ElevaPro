import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ProgressionItem {
  exerciseName: string;
  improvements: string[];
  decreases: string[];
  maintained: string[];
}

interface ProgressionSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  progressionData: ProgressionItem[];
}

export function ProgressionSummaryModal({
  visible,
  onClose,
  progressionData,
}: ProgressionSummaryModalProps) {
  const improvementCount = progressionData.reduce((sum, item) => sum + item.improvements.length, 0);
  const decreaseCount = progressionData.reduce((sum, item) => sum + item.decreases.length, 0);
  const maintainedCount = progressionData.reduce((sum, item) => sum + item.maintained.length, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/90 p-6">
        <View className="w-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden max-w-md">
          {/* Header */}
          <LinearGradient
            colors={['#FF6B35', '#FF2E63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-4">
                <Text className="text-white text-2xl font-black font-display uppercase tracking-tight mb-1">
                  Análise de Progressão
                </Text>
                <Text className="text-white/80 text-sm font-medium">
                  Comparação com treino anterior
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="bg-white/20 p-2 rounded-xl backdrop-blur-md"
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stats Summary */}
          <View className="p-6 bg-zinc-950">
            <View className="flex-row justify-between gap-3">
              {/* Melhorou */}
              <View className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 items-center">
                <Ionicons name="arrow-up" size={24} color="#34D399" />
                <Text className="text-emerald-400 text-2xl font-black mt-2">
                  {improvementCount}
                </Text>
                <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Melhorou
                </Text>
              </View>

              {/* Manteve */}
              <View className="flex-1 bg-zinc-700/10 border border-zinc-600/30 rounded-2xl p-4 items-center">
                <Ionicons name="remove" size={24} color="#A1A1AA" />
                <Text className="text-zinc-400 text-2xl font-black mt-2">{maintainedCount}</Text>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Manteve
                </Text>
              </View>

              {/* Diminuiu */}
              <View className="flex-1 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 items-center">
                <Ionicons name="arrow-down" size={24} color="#F87171" />
                <Text className="text-red-400 text-2xl font-black mt-2">{decreaseCount}</Text>
                <Text className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Diminuiu
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <ScrollView className="max-h-96 p-6" showsVerticalScrollIndicator={false}>
            {progressionData.map((item, index) => (
              <Animated.View
                // biome-ignore lint/suspicious/noArrayIndexKey: progression list
                key={index}
                entering={FadeInDown.delay(index * 50).duration(300)}
                className="mb-4 bg-zinc-800/30 border border-zinc-700 rounded-2xl p-4"
              >
                <Text className="text-white font-black text-sm uppercase tracking-tight mb-3">
                  {item.exerciseName}
                </Text>

                {item.improvements.length > 0 && (
                  <View className="mb-2">
                    {item.improvements.map((improvement, i) => {
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: improvements
                        <View key={i} className="flex-row items-center mb-1">
                          <Ionicons name="arrow-up" size={12} color="#34D399" />
                          <Text className="text-emerald-400 text-xs ml-2">{improvement}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {item.decreases.length > 0 && (
                  <View className="mb-2">
                    {item.decreases.map((decrease, i) => {
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: decreases
                        <View key={i} className="flex-row items-center mb-1">
                          <Ionicons name="arrow-down" size={12} color="#F87171" />
                          <Text className="text-red-400 text-xs ml-2">{decrease}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {item.maintained.length > 0 && (
                  <View>
                    {item.maintained.map((maintain, i) => {
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: maintained stats
                        <View key={i} className="flex-row items-center mb-1">
                          <Ionicons name="remove" size={12} color="#A1A1AA" />
                          <Text className="text-zinc-400 text-xs ml-2">{maintain}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            ))}

            {progressionData.length === 0 && (
              <View className="items-center justify-center py-10">
                <Ionicons name="information-circle-outline" size={48} color="#71717A" />
                <Text className="text-zinc-500 text-center mt-4">
                  Primeira vez fazendo este treino!{'\n'}Sem dados para comparar.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Button */}
          <View className="p-6">
            <TouchableOpacity onPress={onClose}>
              <LinearGradient
                colors={['#FF6B35', '#FF2E63']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-4 rounded-2xl"
              >
                <Text className="text-white text-center font-black text-sm uppercase tracking-widest">
                  Fechar
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
