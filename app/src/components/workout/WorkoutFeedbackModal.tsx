import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WorkoutFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (intensity: number, notes: string) => void;
}

export function WorkoutFeedbackModal({ visible, onClose, onSubmit }: WorkoutFeedbackModalProps) {
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');

  const getIntensityLabel = (value: number) => {
    if (value <= 2) return 'Muito Fácil 😴';
    if (value <= 4) return 'Fácil 🙂';
    if (value <= 6) return 'Moderado 😅';
    if (value <= 8) return 'Difícil 🥵';
    return 'Muito Difícil 💀';
  };

  const getIntensityColor = (value: number) => {
    if (value <= 2) return 'bg-blue-500';
    if (value <= 4) return 'bg-green-500';
    if (value <= 6) return 'bg-yellow-500';
    if (value <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleSubmit = () => {
    onSubmit(intensity, notes);
    // Reset state for next time
    setIntensity(5);
    setNotes('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-zinc-900 rounded-t-3xl p-6 border-t border-zinc-800">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold font-display">Como foi o treino?</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* Intensity Selector */}
          <View className="mb-8">
            <Text className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-4">
              Intensidade (RPE)
            </Text>

            <View className="flex-row justify-between items-center mb-4 bg-zinc-800/50 p-4 rounded-xl">
              <TouchableOpacity
                onPress={() => setIntensity(Math.max(1, intensity - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="remove" size={24} color="white" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-4xl font-bold text-white font-display mb-1">{intensity}</Text>
                <View className={`px-3 py-1 rounded-full ${getIntensityColor(intensity)}`}>
                  <Text className="text-white text-xs font-bold uppercase">
                    {getIntensityLabel(intensity)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIntensity(Math.min(10, intensity + 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Visual Bar */}
            <View className="flex-row h-2 rounded-full overflow-hidden bg-zinc-800 gap-0.5">
              {[...Array(10)].map((_, i) => {
                return (
                  <View
                    // biome-ignore lint/suspicious/noArrayIndexKey: RPE bar items have no unique ID
                    key={`rpe-${i}`}
                    className={`flex-1 ${i < intensity ? getIntensityColor(intensity) : 'bg-transparent'}`}
                  />
                );
              })}
            </View>
          </View>

          {/* Notes Input */}
          <View className="mb-8">
            <Text className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-3">
              Observações (Opcional)
            </Text>
            <TextInput
              className="bg-zinc-800 text-white p-4 rounded-xl min-h-[100px] text-base"
              placeholder="Ex: Senti dor no ombro, aumentei a carga no supino..."
              placeholderTextColor="#52525B"
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-[#FF6B35] p-4 rounded-xl items-center mb-4"
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-lg font-display">Salvar e Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
