import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { type Cores, illustration, mixColors, useCores, useEscala } from '@/shared/design';

interface Category {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: (cores: Cores) => string;
}

/**
 * Cada categoria na cor da grandeza no resto do app. Vegetal não tem métrica
 * própria, e fica no verde de sucesso.
 */
const CATEGORIES: Category[] = [
  { id: 'protein', label: 'Proteína', icon: 'fish-outline', color: (c) => c.metricaProteina },
  { id: 'carbs', label: 'Carbos', icon: 'nutrition-outline', color: (c) => c.metricaCarboidrato },
  { id: 'fat', label: 'Gorduras', icon: 'water-outline', color: (c) => c.metricaGordura },
  { id: 'salad', label: 'Vegetais', icon: 'leaf-outline', color: (c) => c.success },
];

/** O fim do gradiente: a mesma cor ~18% mais escura, a variação que a tela já tinha. */
const SHADE = 0.82;
const ICON_SIZE = 28;

/**
 * A faixa de categorias no topo da busca de alimentos.
 *
 * @example
 * <FoodCategoryStrip />
 */
export function FoodCategoryStrip() {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 pl-6 mb-2">
      {CATEGORIES.map((category) => {
        const color = category.color(cores);
        return (
          <TouchableOpacity key={category.id} className="mr-4 items-center gap-2">
            <LinearGradient
              colors={[color, mixColors(color, illustration.black, SHADE)]}
              className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg border border-white/10"
            >
              <Ionicons name={category.icon} size={escalar(ICON_SIZE)} color={illustration.white} />
            </LinearGradient>
            <Text className="text-zinc-400 text-[0.625rem] uppercase font-black tracking-widest">
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View className="w-6" />
    </ScrollView>
  );
}
