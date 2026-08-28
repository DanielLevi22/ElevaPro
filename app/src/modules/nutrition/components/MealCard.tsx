import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors as brandColors } from '@/constants/colors';

interface MealCardProps {
  meal: { meal_time?: string; name?: string; id: string };
  items: {
    id: string;
    quantity: number;
    unit?: string;
    is_substitution?: boolean;
    food?: { name: string; serving_size?: number | null; calories?: number | null };
  }[];
  onAddFood: () => void;
  onRemoveFood: (itemId: string) => void;
  onUpdateMealTime: (mealId: string, time: string) => void;
  onUpdateFood: (itemId: string, quantity: number) => void;
  isEditable?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
  onSubstituteFood?: (itemId: string, food: unknown) => void;
}

export function MealCard({
  meal,
  items,
  onAddFood: _onAddFood,
  onRemoveFood: _onRemoveFood,
  onUpdateMealTime: _onUpdateMealTime,
  onUpdateFood: _onUpdateFood,
  isEditable = false,
  isChecked = false,
  onToggleCheck,
  onSubstituteFood,
  onCook,
}: MealCardProps & { onCook?: () => void }) {
  const totalCals = (items || []).reduce((acc, item) => {
    const food = item.food;
    if (!food) return acc;
    const ratio = (item.quantity || 100) / (food.serving_size || 100);
    return acc + (food.calories || 0) * ratio;
  }, 0);

  return (
    <View
      className={`rounded-2xl p-4 border mb-4 ${isChecked ? 'bg-emerald-500/5' : ''}`}
      style={{
        backgroundColor: isChecked
          ? `${brandColors.status.success}08`
          : brandColors.background.secondary,
        borderColor: isChecked ? `${brandColors.status.success}40` : brandColors.border.dark,
      }}
    >
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center flex-1">
          {onToggleCheck && (
            <TouchableOpacity
              onPress={onToggleCheck}
              className={`mr-3 w-7 h-7 rounded-full border-2 items-center justify-center`}
              style={{
                backgroundColor: isChecked ? brandColors.status.success : 'transparent',
                borderColor: isChecked ? brandColors.status.success : brandColors.text.muted,
              }}
            >
              {isChecked && <Ionicons name="checkmark" size={16} color="#000" />}
            </TouchableOpacity>
          )}
          <View
            className="px-2.5 py-1 rounded-lg mr-3 border"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              {meal.meal_time || '00:00'}
            </Text>
          </View>
          <Text
            className={`font-bold text-base mr-2 ${isChecked ? 'text-zinc-400 line-through' : 'text-white'}`}
          >
            {meal.name}
          </Text>
          {isEditable && (
            <TouchableOpacity
              onPress={() => {
                /* Handle edit meal name/time if needed */
              }}
            >
              <Ionicons name="pencil" size={12} color="#52525B" />
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className="font-black text-sm uppercase tracking-widest font-display"
            style={{ color: isChecked ? brandColors.text.muted : brandColors.primary.start }}
          >
            {Math.round(totalCals)} kcal
          </Text>
          {isEditable && (
            <TouchableOpacity onPress={_onAddFood} className="bg-zinc-800 p-1.5 rounded-lg">
              <Ionicons name="add" size={16} color="#00D9FF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {items.length > 0 ? (
        <View>
          <View className="gap-2 pl-2 border-l-2 border-zinc-800 ml-2 mb-3">
            {items.map((item, idx) => {
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: meal items list
                <View key={idx} className="flex-row justify-between items-center py-1">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center">
                      <Text
                        className={`text-zinc-400 text-sm ${item.is_substitution ? 'text-zinc-300 font-bold' : ''}`}
                      >
                        {item.food?.name}
                      </Text>
                      {item.is_substitution && (
                        <View className="ml-2 px-1.5 py-0.5 bg-brand-primary/20 rounded-md">
                          <Text className="text-brand-primary text-[8px] font-black uppercase">
                            Substituído
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-zinc-500 text-[10px]">
                      {item.quantity}
                      {item.unit || 'g'}
                    </Text>
                  </View>

                  {!isEditable && !isChecked && onSubstituteFood && (
                    <TouchableOpacity
                      onPress={() => onSubstituteFood(item.id, item.food)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50"
                    >
                      <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        Trocar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {onCook && !isChecked && (
            <TouchableOpacity
              onPress={onCook}
              className="flex-row items-center justify-center py-2.5 rounded-2xl border"
              style={{
                backgroundColor: `${brandColors.primary.start}10`,
                borderColor: `${brandColors.primary.start}20`,
              }}
            >
              <Ionicons
                name="flame-outline"
                size={16}
                color={brandColors.primary.start}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: brandColors.primary.start }}
              >
                Cozinhar Agora
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text className="text-zinc-600 text-xs italic ml-11">Sem alimentos</Text>
      )}
    </View>
  );
}
