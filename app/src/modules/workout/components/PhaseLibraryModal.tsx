import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  ImageBackground,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MuscleFilterCarousel } from '@/components/workout/MuscleFilterCarousel';
import { useCores, useEscala } from '@/shared/design';
import { MUSCLE_IMAGES } from '../constants/muscleImages';
import type { Workout } from '../store/workoutStore';

interface PhaseLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  workouts: Workout[];
  search: string;
  onChangeSearch: (value: string) => void;
  selectedMuscle: string | null;
  onSelectMuscle: (muscle: string | null) => void;
  onImport: (workoutId: string) => void;
}

/** Biblioteca de treinos do especialista, pra importar um modelo pra esta fase. */
export function PhaseLibraryModal({
  visible,
  onClose,
  workouts,
  search,
  onChangeSearch,
  selectedMuscle,
  onSelectMuscle,
  onImport,
}: PhaseLibraryModalProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95 pt-20">
        <View className="px-6 flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-3xl font-extrabold text-white font-display">Biblioteca</Text>
            <Text className="text-zinc-400 text-sm">Toque num modelo para importar</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-zinc-900 rounded-full items-center justify-center border border-zinc-800"
          >
            <Ionicons name="close" size={escalar(24)} color={cores.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View className="px-6 mb-6">
          <View className="bg-zinc-900 flex-row items-center px-4 py-3 rounded-2xl border border-zinc-800 mb-4">
            <Ionicons
              name="search"
              size={escalar(20)}
              color={cores.mutedForeground}
              style={{ marginRight: 12 }}
            />
            <TextInput
              placeholder="Buscar na biblioteca..."
              placeholderTextColor={cores.mutedForeground}
              className="flex-1 text-white font-medium"
              value={search}
              onChangeText={onChangeSearch}
            />
          </View>

          <MuscleFilterCarousel selectedMuscle={selectedMuscle} onSelectMuscle={onSelectMuscle} />
        </View>

        <FlatList
          data={workouts}
          keyExtractor={(item) => `lib-${item.id}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onImport(item.id)}
              className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-4 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-xl overflow-hidden mr-4">
                <ImageBackground
                  source={MUSCLE_IMAGES[item.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
                  className="w-full h-full"
                />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">{item.title}</Text>
                <Text className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  {item.muscle_group || 'Geral'} • {item.difficulty || 'Iniciante'}
                </Text>
              </View>
              <Ionicons name="add-circle" size={escalar(24)} color={cores.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="search" size={escalar(64)} color={cores.muted} />
              <Text className="text-zinc-600 mt-4">Nenhum modelo encontrado</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
