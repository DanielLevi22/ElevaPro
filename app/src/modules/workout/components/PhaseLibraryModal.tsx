import { Ionicons } from '@expo/vector-icons';
import { FlatList, ImageBackground, Modal, Text, TouchableOpacity, View } from 'react-native';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
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
      <View className="flex-1 bg-background pt-20">
        <View className="mb-6 flex-row items-center justify-between px-6">
          <View>
            <Text className="text-[1.6875rem] font-bold tracking-tight text-hero">Biblioteca</Text>
            <Text className="text-[0.8125rem] text-muted-foreground">
              Toque num modelo para importar
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={escalar(22)} color={cores.foreground} />
          </TouchableOpacity>
        </View>

        <View className="mb-6 gap-3 px-6">
          <GlassSearchField
            value={search}
            onChangeText={onChangeSearch}
            placeholder="Buscar na biblioteca…"
          />
          <MuscleFilterCarousel selectedMuscle={selectedMuscle} onSelectMuscle={onSelectMuscle} />
        </View>

        <FlatList
          data={workouts}
          keyExtractor={(item) => `lib-${item.id}`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onImport(item.id)}
              className="mb-3 flex-row items-center rounded-lg border border-border bg-card p-3"
            >
              <View className="mr-3 h-12 w-12 overflow-hidden rounded-md">
                <ImageBackground
                  source={MUSCLE_IMAGES[item.muscle_group || 'Geral'] || MUSCLE_IMAGES.Geral}
                  className="h-full w-full"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[0.9375rem] font-bold text-foreground">{item.title}</Text>
                <Text className="text-legenda font-bold uppercase tracking-wide text-muted-foreground">
                  {item.muscle_group || 'Geral'} · {item.difficulty || 'Iniciante'}
                </Text>
              </View>
              <Ionicons name="add-circle" size={escalar(24)} color={cores.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="search" size={escalar(64)} color={cores.placeholder} />
              <Text className="mt-4 text-muted-foreground">Nenhum modelo encontrado</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
