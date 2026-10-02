import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { colors as brandColors } from '@/constants/colors';
import { ABOVE_TAB_BAR, useBottomOffset, useCores, useEscala } from '@/shared/design';
import { FoodCategoryStrip } from '../components/foodSearch/FoodCategoryStrip';
import { FoodResultCard } from '../components/foodSearch/FoodResultCard';
import { ReverseCalculatorPanel } from '../components/foodSearch/ReverseCalculatorPanel';
import { useReverseCalculator } from '../hooks/useReverseCalculator';
import { useNutritionStore } from '../store/nutritionStore';
import type { FoodItem, SubstitutionTarget } from '../types';

export type { FoodItem } from '../types';

interface FoodSearchScreenProps {
  /** Recebe o alimento escolhido e a quantidade que acerta os alvos, se houver. */
  onSelect: (food: FoodItem, quantity?: number) => void;
  onClose: () => void;
  /** Os macros do alimento que está sendo trocado: o ponto de partida dos alvos. */
  substitutionTarget: SubstitutionTarget;
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 500;

/**
 * A busca da troca de alimento: o aluno procura o substituto, e a calculadora
 * reversa ordena e sugere a quantidade que entrega os macros do original.
 *
 * @example
 * <FoodSearchScreen substitutionTarget={macros} onSelect={trocar} onClose={fechar} />
 */
export default function FoodSearchScreen({
  onSelect,
  onClose,
  substitutionTarget,
}: FoodSearchScreenProps) {
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const escalar = useEscala();
  const listEnd = useBottomOffset(ABOVE_TAB_BAR);
  const calculator = useReverseCalculator(substitutionTarget);
  const [query, setQuery] = useState('');
  const { foods, isLoading, loadMore } = useFoodPages(query);

  const select = (food: FoodItem) => {
    const match = calculator.match(food);
    onSelect(food, match?.isMatch ? match.quantity : undefined);
  };

  return (
    <View className="flex-1 bg-black">
      <View
        style={{ paddingTop: insets.top }}
        className="z-10 bg-zinc-900 border-b border-zinc-800 rounded-b-[2rem]"
      >
        <SearchHeader onClose={onClose} />
        <FoodCategoryStrip />
        <View className="px-6 pb-4">
          <Input
            placeholder="Digite o nome do alimento..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            className="mb-4"
          />
          <ReverseCalculatorPanel calculator={calculator} />
        </View>
      </View>

      <FlatList
        data={calculator.sort(foods)}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-6"
        contentContainerStyle={{ paddingBottom: listEnd }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <Text className="text-zinc-400 font-bold text-sm mb-2">RESULTADOS DA BUSCA</Text>
        }
        renderItem={({ item }) => (
          <FoodResultCard food={item} match={calculator.match(item)} onSelect={select} />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center mt-10">
            <Ionicons name="search-outline" size={escalar(48)} color={cores.placeholder} />
            <Text className="text-zinc-500 mt-4 font-bold">
              {query ? 'Nenhum alimento encontrado' : 'Digite para buscar'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={brandColors.primary.start} className="mt-4" />
          ) : null
        }
      />
    </View>
  );
}

function SearchHeader({ onClose }: { onClose: () => void }) {
  const escalar = useEscala();

  return (
    <View
      className="flex-row items-center px-6 py-5 border-b"
      style={{
        backgroundColor: brandColors.background.secondary,
        borderColor: brandColors.border.dark,
      }}
    >
      <View className="flex-1">
        <Text className="text-xl font-black text-white font-display tracking-tight italic">
          BUSCAR ALIMENTO
        </Text>
        <Text className="text-zinc-500 text-[0.625rem] font-black uppercase tracking-widest">
          Banco de Dados Nutricional
        </Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar busca"
        className="p-2 rounded-full border"
        style={{
          backgroundColor: brandColors.background.primary,
          borderColor: brandColors.border.dark,
        }}
      >
        <Ionicons name="close" size={escalar(20)} color={brandColors.text.muted} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * A busca paginada do catálogo: espera a pessoa parar de digitar, recomeça da
 * primeira página a cada termo e pede a próxima ao fim da lista.
 */
function useFoodPages(query: string) {
  const { searchFoods, foods } = useNutritionStore();
  const loading = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (nextPage: number) => {
      if (loading.current) return;
      loading.current = true;
      setIsLoading(true);
      try {
        const results = await searchFoods(query, nextPage, PAGE_SIZE);
        setPage(nextPage);
        setHasMore(results.length === PAGE_SIZE);
      } finally {
        loading.current = false;
        setIsLoading(false);
      }
    },
    [query, searchFoods]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(0), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  const loadMore = () => {
    if (hasMore && !isLoading) load(page + 1);
  };

  const results: FoodItem[] = foods;
  return { foods: results, isLoading, loadMore };
}
