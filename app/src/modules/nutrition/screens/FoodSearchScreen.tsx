import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { colors as brandColors } from '@/constants/colors';
import { useNutritionStore } from '../store/nutritionStore';

export interface FoodItem {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_size: number;
  serving_unit: string;
}

interface FoodSearchScreenProps {
  mealId?: string;
  initialData?: {
    name: string;
    time: string;
    type: string;
    order: number;
  };
  onSelect: (food: FoodItem, quantity?: number) => void;
  onClose: () => void;
  onSave?: (
    items: {
      id: string;
      food: FoodItem;
      food_id: string;
      quantity: number;
      unit: string;
      order_index: number;
    }[]
  ) => Promise<void>;

  mealTime?: string;
  onTimeChange?: (time: string) => void;
  substitutionTarget?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

type MacroType = 'protein' | 'carbs' | 'fat' | 'calories';

interface MacroTargets {
  protein?: string;
  carbs?: string;
  fat?: string;
  calories?: string;
}

const DEFAULT_TIMES: Record<string, string> = {
  'Café da Manhã': '08:00',
  'Lanche da Manhã': '10:00',
  Almoço: '12:00',
  'Lanche da Tarde': '16:00',
  Jantar: '20:00',
  Ceia: '22:00',
};

export default function FoodSearchScreen({
  mealId,
  initialData,
  onSelect,
  onClose,
  onSave,

  mealTime,
  onTimeChange,
  substitutionTarget,
}: FoodSearchScreenProps) {
  const insets = useSafeAreaInsets();
  const { searchFoods, foods, meals, mealItems, fetchMealItems } = useNutritionStore();
  const isLoadingRef = useRef(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Time Picker Logic
  const [showTimePicker, setShowTimePicker] = useState(false);

  const parseTime = (timeStr: string) => {
    if (!timeStr) return new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0);
    date.setMinutes(minutes || 0);
    return date;
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && onTimeChange) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onTimeChange(`${hours}:${minutes}`);
    }
  };

  // Local state for items (Draft Mode)
  const [localItems, setLocalItems] = useState<
    {
      id: string;
      food?: FoodItem;
      food_id: string;
      quantity: number;
      unit: string;
      order_index: number;
    }[]
  >([]);

  // Initialize items
  useEffect(() => {
    if (mealId) {
      fetchMealItems(mealId);
      // Sync local items with store items when they load
      if (mealItems[mealId]) {
        setLocalItems(
          mealItems[mealId].map((item) => ({
            id: item.id,
            food_id: item.food_id,
            food: item.food as FoodItem | undefined,
            quantity: item.quantity,
            unit: item.unit,
            order_index: item.order_index,
          }))
        );
      }
    }
  }, [mealId, mealItems, fetchMealItems]); // Re-sync if store updates

  // Get meal details (from store or initial data)
  const mealName = mealId ? meals.find((m) => m.id === mealId)?.name : initialData?.name;

  // Calculate Meal Macros from LOCAL items
  const mealMacros = useMemo(() => {
    return localItems.reduce(
      (acc, item) => {
        const ratio = item.quantity / (item.food?.serving_size || 100);
        return {
          calories: acc.calories + (item.food?.calories || 0) * ratio,
          protein: acc.protein + (item.food?.protein || 0) * ratio,
          carbs: acc.carbs + (item.food?.carbs || 0) * ratio,
          fat: acc.fat + (item.food?.fat || 0) * ratio,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [localItems]);

  const handleLocalSelect = (food: FoodItem) => {
    // Add to local state
    const match = calculateMatch(food);
    const quantity = match?.isMatch ? match.quantity : 100; // Default 100g/ml

    const newItem = {
      id: Math.random().toString(), // Temp ID
      food: food,
      food_id: food.id,
      quantity: Math.round(quantity),
      unit: food.serving_unit,
      order_index: localItems.length,
    };

    setLocalItems([...localItems, newItem]);
    // Clear query to show added items
    setQuery('');
  };

  const handleLocalRemove = (itemId: string) => {
    setLocalItems(localItems.filter((i) => i.id !== itemId));
  };

  // Auto-fill time if empty and name matches
  useEffect(() => {
    if (!mealTime && mealName && onTimeChange) {
      const defaultTime = DEFAULT_TIMES[mealName];
      if (defaultTime) {
        onTimeChange(defaultTime);
      }
    }
  }, [mealName, mealTime, onTimeChange]);

  // Handle substitution target initialization
  useEffect(() => {
    if (substitutionTarget) {
      setTargets({
        protein: Math.round(substitutionTarget.protein).toString(),
        carbs: Math.round(substitutionTarget.carbs).toString(),
        fat: Math.round(substitutionTarget.fat).toString(),
        calories: Math.round(substitutionTarget.calories).toString(),
      });
      setActiveMacros(['protein', 'carbs', 'fat', 'calories']);
      setShowCalculator(true);
    }
  }, [substitutionTarget]);

  const handleSavePress = async () => {
    if (!onSave) return;

    // Validate Time
    if (onTimeChange && !mealTime) {
      Alert.alert(
        'Horário Obrigatório',
        'Por favor, defina o horário da refeição antes de concluir.'
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        localItems
          .filter((item) => item.food !== undefined)
          .map((item) => ({ ...item, food: item.food as FoodItem }))
      );
      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Erro', 'Falha ao salvar refeição');
    } finally {
      setIsSaving(false);
    }
  };

  // Reverse Calculator State
  const [targets, setTargets] = useState<MacroTargets>({});
  const [activeMacros, setActiveMacros] = useState<MacroType[]>([]);
  const [showCalculator, setShowCalculator] = useState(true);

  const loadFoods = useCallback(
    async (reset = false) => {
      if (isLoadingRef.current) return;

      const nextPage = reset ? 0 : page + 1;
      setIsLoading(true);
      isLoadingRef.current = true;

      try {
        const results = await searchFoods(query, nextPage, 10);
        if (reset) {
          setPage(0);
          setHasMore(results.length === 10);
        } else {
          setPage(nextPage);
          setHasMore(results.length === 10);
        }
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [page, query, searchFoods]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFoods(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [loadFoods]);

  // --- Reverse Calculator Logic ---

  const toggleMacro = (macro: MacroType) => {
    setActiveMacros((prev) => {
      if (prev.includes(macro)) {
        const newMacros = prev.filter((m) => m !== macro);
        const newTargets = { ...targets };
        delete newTargets[macro];
        setTargets(newTargets);
        return newMacros;
      } else {
        return [...prev, macro];
      }
    });
  };

  const updateTarget = (macro: MacroType, value: string) => {
    setTargets((prev) => ({ ...prev, [macro]: value }));
  };

  const calculateMatch = (food: FoodItem) => {
    if (activeMacros.length === 0) return null;

    const quantities: number[] = [];
    let validTargets = 0;

    for (const macro of activeMacros) {
      const targetVal = parseFloat(targets[macro] || '0');
      if (targetVal > 0) {
        const foodVal = food[macro] ?? 0;
        if (foodVal > 0) {
          quantities.push((targetVal / foodVal) * (food.serving_size || 100));
          validTargets++;
        } else {
          quantities.push(Infinity);
          validTargets++;
        }
      }
    }

    if (validTargets === 0) return null;
    if (quantities.some((q) => q === Infinity)) return { quantity: 0, score: 0, isMatch: false };

    const avgQuantity = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const variance =
      quantities.reduce((acc, q) => acc + (q - avgQuantity) ** 2, 0) / quantities.length;
    const score = 100 / (1 + variance / 1000);

    return { quantity: avgQuantity, score, isMatch: true };
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: calculateMatch is stable in this context
  const sortedFoods = useMemo(() => {
    if (activeMacros.length === 0) return foods;
    return [...foods].sort((a, b) => {
      const matchA = calculateMatch(a);
      const matchB = calculateMatch(b);
      const scoreA = matchA?.isMatch ? matchA.score : -1;
      const scoreB = matchB?.isMatch ? matchB.score : -1;
      return scoreB - scoreA;
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: Intentional dependencies for re-sorting
  }, [foods, targets, activeMacros, calculateMatch]);

  const handleSelectFood = (food: FoodItem) => {
    const match = calculateMatch(food);
    onSelect(food, match?.isMatch ? match.quantity : undefined);
  };

  return (
    <View className="flex-1 bg-black">
      <View
        style={{ paddingTop: insets.top }}
        className="z-10 bg-zinc-900 border-b border-zinc-800 rounded-b-[32px]"
      >
        {/* Header */}
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
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Banco de Dados Nutricional
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="p-2 rounded-full border"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Ionicons name="close" size={20} color={brandColors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Visual Category Thumbnails */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 pl-6 mb-2">
          {[
            {
              id: 'protein',
              label: 'Proteína',
              icon: 'fish-outline' as const,
              color: ['#10B981', '#059669'],
            },
            {
              id: 'carbs',
              label: 'Carbos',
              icon: 'nutrition-outline' as const,
              color: ['#A855F7', '#7C3AED'],
            },
            {
              id: 'fat',
              label: 'Gorduras',
              icon: 'water-outline' as const,
              color: ['#F59E0B', '#D97706'],
            },
            {
              id: 'salad',
              label: 'Vegetais',
              icon: 'leaf-outline' as const,
              color: ['#14B8A6', '#0D9488'],
            },
          ].map((cat, _index) => (
            <TouchableOpacity key={cat.id} className="mr-4 items-center gap-2">
              <LinearGradient
                colors={cat.color as [string, string, ...string[]]}
                className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg border border-white/10"
              >
                <Ionicons name={cat.icon} size={28} color="white" />
              </LinearGradient>
              <Text className="text-zinc-400 text-[10px] uppercase font-black tracking-widest">
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View className="w-6" />
          {/* Spacer */}
        </ScrollView>

        {/* Draft Mode Header Actions */}
        {(onTimeChange || localItems.length > 0 || mealId) && (
          <View className="px-6 mb-4 flex-row justify-between items-center">
            <View>
              <Text className="text-zinc-400 text-xs font-bold">REFEIÇÃO</Text>
              <Text className="text-white font-bold text-lg">{mealName || 'Nova Refeição'}</Text>
              {onTimeChange && (
                <View className="mt-2">
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="bg-background-primary rounded-lg border-2 border-zinc-800 px-4 py-2 flex-row items-center justify-center shadow-md"
                    style={{
                      shadowColor: brandColors.primary.start,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text className="text-primary font-mono text-xl font-bold tracking-[4px]">
                      {mealTime || '00:00'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSavePress}
              disabled={isSaving}
              className="bg-primary px-4 py-2 rounded-full"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text className="text-black font-bold text-sm">Concluir</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={parseTime(mealTime || '00:00')}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Meal Macros Summary */}
        <View className="px-6 mb-4">
          <View
            className="p-3 rounded-2xl border flex-row justify-between items-center"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <View className="items-center flex-1">
              <Text className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                KCAL
              </Text>
              <Text className="text-white font-black italic">
                {Math.round(mealMacros.calories)}
              </Text>
            </View>
            <View className="w-[1px] h-8 bg-zinc-800" />
            <View className="items-center flex-1">
              <Text
                className="text-[9px] font-black uppercase tracking-wider"
                style={{ color: brandColors.macro.protein }}
              >
                PROT
              </Text>
              <Text className="text-white font-black italic">
                {Math.round(mealMacros.protein)}g
              </Text>
            </View>
            <View className="w-[1px] h-8 bg-zinc-800" />
            <View className="items-center flex-1">
              <Text
                className="text-[9px] font-black uppercase tracking-wider"
                style={{ color: brandColors.macro.carbs }}
              >
                CARB
              </Text>
              <Text className="text-white font-black italic">{Math.round(mealMacros.carbs)}g</Text>
            </View>
            <View className="w-[1px] h-8 bg-zinc-800" />
            <View className="items-center flex-1">
              <Text
                className="text-[9px] font-black uppercase tracking-wider"
                style={{ color: brandColors.macro.fat }}
              >
                GORD
              </Text>
              <Text className="text-white font-black italic">{Math.round(mealMacros.fat)}g</Text>
            </View>
          </View>
        </View>

        <View className="px-6">
          <Input
            placeholder="Digite o nome do alimento..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            className="mb-4"
          />
          <TouchableOpacity
            onPress={() => setShowCalculator(!showCalculator)}
            className="flex-row items-center justify-between bg-background-primary p-3 rounded-xl border border-zinc-800"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="calculator-outline" size={20} color={brandColors.secondary.main} />
              <Text className="text-zinc-300 font-bold text-sm">Calculadora Reversa</Text>
            </View>
            <Ionicons
              name={showCalculator ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#71717A"
            />
          </TouchableOpacity>

          {showCalculator && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {(['protein', 'carbs', 'fat', 'calories'] as const).map((macro) => {
                const isActive = activeMacros.includes(macro);
                return (
                  <View
                    key={macro}
                    className={`flex-row items-center rounded-xl border overflow-hidden h-12 w-[48%] ${
                      isActive ? 'bg-zinc-900' : 'bg-transparent border-zinc-800'
                    }`}
                    style={isActive ? { borderColor: brandColors.primary.start } : {}}
                  >
                    <TouchableOpacity
                      className={`h-full px-3 justify-center items-center flex-1 ${isActive ? 'border-r border-zinc-800' : ''}`}
                      onPress={() => toggleMacro(macro)}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          isActive ? 'text-white' : 'text-zinc-600'
                        }`}
                      >
                        {macro === 'protein'
                          ? 'PROT'
                          : macro === 'carbs'
                            ? 'CARB'
                            : macro === 'fat'
                              ? 'GORD'
                              : 'KCAL'}
                      </Text>
                    </TouchableOpacity>

                    {isActive && (
                      <View className="w-16 h-full justify-center">
                        <TextInput
                          className="h-full w-full text-center text-sm p-0 text-white font-black italic"
                          placeholder="0"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          keyboardType="numeric"
                          value={targets[macro] || ''}
                          onChangeText={(val) => updateTarget(macro, val)}
                          style={{
                            fontSize: 14,
                            textAlignVertical: 'center',
                            includeFontPadding: false,
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={sortedFoods}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        onEndReached={() => {
          if (hasMore && !isLoading) {
            loadFoods();
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          <View className="mb-6">
            {/* Added Foods List */}
            {localItems.length > 0 && (
              <View className="mb-6">
                <Text className="text-zinc-400 font-bold text-sm mb-3">ALIMENTOS ADICIONADOS</Text>
                {localItems.map((item, _idx) => (
                  <View
                    key={item.id}
                    className="flex-row justify-between items-center py-2 border-b border-zinc-800"
                  >
                    <View className="flex-1">
                      <Text className="text-white font-bold">{item.food?.name}</Text>
                      <Text className="text-zinc-500 text-xs">
                        {item.quantity}
                        {item.unit}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleLocalRemove(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text className="text-zinc-400 font-bold text-sm mb-2">RESULTADOS DA BUSCA</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const match = calculateMatch(item);
          return (
            <TouchableOpacity
              className="p-5 rounded-3xl mb-3 border flex-row justify-between items-center"
              style={{
                backgroundColor: brandColors.background.secondary,
                borderColor: brandColors.border.dark,
              }}
              onPress={() =>
                substitutionTarget ? handleSelectFood(item) : handleLocalSelect(item)
              }
            >
              <View className="flex-1 mr-4">
                <Text className="text-white font-bold text-base mb-1 font-display tracking-wide">
                  {item.name}
                </Text>

                {match?.isMatch ? (
                  <View>
                    <Text
                      className="font-black text-xl italic"
                      style={{ color: brandColors.status.success }}
                    >
                      {Math.round(match.quantity)}
                      {item.serving_unit}
                    </Text>
                    <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                      SUGESTÃO EXATA
                    </Text>
                    {match.score > 80 && (
                      <LinearGradient
                        colors={brandColors.gradients.primary}
                        className="self-start px-3 py-1 rounded-full mt-2"
                      >
                        <Text className="text-white text-[9px] font-black uppercase tracking-widest">
                          PERFEITO
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                ) : (
                  <View className="flex-row gap-4 mt-1">
                    <Text className="text-zinc-500 text-[10px] font-black">
                      {item.calories} KCAL
                    </Text>
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: brandColors.macro.protein }}
                    >
                      P: {item.protein}g
                    </Text>
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: brandColors.macro.carbs }}
                    >
                      C: {item.carbs}g
                    </Text>
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: brandColors.macro.fat }}
                    >
                      G: {item.fat}g
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() =>
                  substitutionTarget ? handleSelectFood(item) : handleLocalSelect(item)
                }
                className="w-10 h-10 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: brandColors.background.primary,
                  borderColor: brandColors.border.dark,
                }}
              >
                <Ionicons
                  name={substitutionTarget ? 'swap-horizontal' : 'add'}
                  size={20}
                  color={brandColors.primary.start}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center justify-center mt-10">
            <Ionicons name="search-outline" size={48} color="#3F3F46" />
            <Text className="text-zinc-500 mt-4 font-bold">
              {query ? 'Nenhum alimento encontrado' : 'Digite para buscar'}
            </Text>
          </View>
        )}
        ListFooterComponent={() =>
          isLoading ? (
            <ActivityIndicator size="small" color={brandColors.primary.start} className="mt-4" />
          ) : null
        }
      />
    </View>
  );
}
