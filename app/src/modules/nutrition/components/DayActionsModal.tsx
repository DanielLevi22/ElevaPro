import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface DayActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onGenerate: () => void;
  hasCopiedDay: boolean;
  dayName: string;
}

export function DayActionsModal({
  visible,
  onClose,
  onCopy,
  onPaste,
  onClear,
  onGenerate,
  hasCopiedDay,
  dayName,
}: DayActionsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="bg-zinc-900 rounded-t-[32px] p-6 border-t border-zinc-800">
          <View className="items-center mb-6">
            <View className="w-12 h-1 bg-zinc-800 rounded-full mb-4" />
            <Text className="text-xl font-bold text-white font-display">Gerenciar {dayName}</Text>
          </View>

          <View className="gap-3 mb-8">
            <TouchableOpacity
              className="flex-row items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800"
              onPress={() => {
                onGenerate();
                onClose();
              }}
            >
              <View className="w-10 h-10 rounded-full bg-cyan-500/10 items-center justify-center mr-4">
                <Ionicons name="restaurant-outline" size={20} color="#00D9FF" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Gerar Refeições Padrão</Text>
                <Text className="text-zinc-500 text-xs">Café, Almoço, Lanche e Jantar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800"
              onPress={() => {
                onCopy();
                onClose();
              }}
            >
              <View className="w-10 h-10 rounded-full bg-purple-500/10 items-center justify-center mr-4">
                <Ionicons name="copy-outline" size={20} color="#A855F7" />
              </View>
              <Text className="text-white font-bold text-base">Copiar Dia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800 ${!hasCopiedDay ? 'opacity-50' : ''}`}
              disabled={!hasCopiedDay}
              onPress={() => {
                onPaste();
                onClose();
              }}
            >
              <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center mr-4">
                <Ionicons name="clipboard-outline" size={20} color="#10B981" />
              </View>
              <Text className="text-white font-bold text-base">Colar Dia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800"
              onPress={() => {
                onClear();
                onClose();
              }}
            >
              <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text className="text-red-500 font-bold text-base">Limpar Dia</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl items-center" onPress={onClose}>
            <Text className="text-zinc-400 font-bold">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
