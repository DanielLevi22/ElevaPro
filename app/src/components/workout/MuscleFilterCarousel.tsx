import { Ionicons } from '@expo/vector-icons';
import type { ViewStyle } from 'react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface MuscleFilterCarouselProps {
  selectedMuscle: string | null;
  onSelectMuscle: (muscle: string | null) => void;
  containerStyle?: ViewStyle;
}

export const MUSCLE_FILTERS = [
  { name: 'Peito', icon: 'fitness' },
  { name: 'Costas', icon: 'body' },
  { name: 'Pernas', icon: 'footsteps' },
  { name: 'Braços', icon: 'barbell' },
  { name: 'Ombros', icon: 'shield' },
  { name: 'Abdominais', icon: 'grid' },
] as const;

export function MuscleFilterCarousel({
  selectedMuscle,
  onSelectMuscle,
  containerStyle,
}: MuscleFilterCarouselProps) {
  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 24 }}
        className="flex-row"
      >
        <TouchableOpacity
          onPress={() => onSelectMuscle(null)}
          className={`flex-row items-center px-4 py-2.5 rounded-2xl mr-3 border ${!selectedMuscle ? 'bg-orange-500/10 border-orange-500/30' : 'bg-zinc-900 border-zinc-800'}`}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={!selectedMuscle ? '#FF6B35' : '#71717A'}
            style={{ marginRight: 8 }}
          />
          <Text className={`font-bold ${!selectedMuscle ? 'text-white' : 'text-zinc-500'}`}>
            Todos
          </Text>
        </TouchableOpacity>

        {MUSCLE_FILTERS.map((m) => (
          <TouchableOpacity
            key={m.name}
            onPress={() => onSelectMuscle(m.name)}
            className={`flex-row items-center px-4 py-2.5 rounded-2xl mr-3 border ${selectedMuscle === m.name ? 'bg-orange-500/10 border-orange-500/30' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <Ionicons
              name={m.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={selectedMuscle === m.name ? '#FF6B35' : '#71717A'}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-bold ${selectedMuscle === m.name ? 'text-white' : 'text-zinc-500'}`}
            >
              {m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
