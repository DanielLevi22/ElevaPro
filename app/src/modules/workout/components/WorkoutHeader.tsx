import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';

interface WorkoutHeaderProps {
  title: string;
  itemCount: number;
  onExit: () => void;
}

export function WorkoutHeader({ title, itemCount, onExit }: WorkoutHeaderProps) {
  const handleExit = () => {
    showConfirm({
      title: 'Sair do Treino',
      message: 'Deseja realmente sair? O progresso não salvo será perdido.',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      onConfirm: onExit,
    });
  };

  return (
    <View className="flex-row justify-between items-center px-6 py-8 bg-black">
      <TouchableOpacity
        onPress={handleExit}
        className="bg-zinc-900 p-3 rounded-xl border border-zinc-800"
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View className="items-center flex-1 mx-4">
        <Text
          className="text-white text-xl font-black font-display text-center uppercase tracking-tight"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="bg-orange-500/10 px-2 py-0.5 rounded-full mt-1">
          <Text className="text-orange-500 text-[10px] font-black uppercase tracking-widest">
            {itemCount} MOVIMENTOS
          </Text>
        </View>
      </View>
      <View className="w-12" />
    </View>
  );
}
