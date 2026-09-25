import type { Ionicons } from '@expo/vector-icons';
import type { ViewStyle } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Chip } from '@/components/ui/Chip';

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
] as const satisfies { name: string; icon: keyof typeof Ionicons.glyphMap }[];

export function MuscleFilterCarousel({
  selectedMuscle,
  onSelectMuscle,
  containerStyle,
}: MuscleFilterCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-1.5 pr-6"
      style={containerStyle}
    >
      <TouchableOpacity
        onPress={() => onSelectMuscle(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: !selectedMuscle }}
      >
        <Chip tom={!selectedMuscle ? 'destaque' : 'neutro'} icone="grid-outline">
          Todos
        </Chip>
      </TouchableOpacity>

      {MUSCLE_FILTERS.map((m) => (
        <TouchableOpacity
          key={m.name}
          onPress={() => onSelectMuscle(m.name)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMuscle === m.name }}
        >
          <Chip tom={selectedMuscle === m.name ? 'destaque' : 'neutro'} icone={m.icon}>
            {m.name}
          </Chip>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
