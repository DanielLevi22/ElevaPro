import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors as brandColors } from '@/constants/colors';
import { useEscala } from '@/shared/design';
import type { FoodMatch } from '../../services/reverseCalculator';
import type { FoodItem } from '../../types';

/** Acima desta nota a troca é quase exata, e o cartão ganha o selo. */
const PERFECT_SCORE = 80;
const ICON_SIZE = 20;

interface FoodResultCardProps {
  food: FoodItem;
  match: FoodMatch | null;
  onSelect: (food: FoodItem) => void;
}

/**
 * Um alimento da busca. Com a calculadora acertando os alvos, mostra a
 * quantidade sugerida; sem ela, os macros da porção.
 *
 * @example
 * <FoodResultCard food={food} match={calculator.match(food)} onSelect={trocar} />
 */
export function FoodResultCard({ food, match, onSelect }: FoodResultCardProps) {
  const escalar = useEscala();

  return (
    <TouchableOpacity
      className="p-5 rounded-3xl mb-3 border flex-row justify-between items-center"
      style={{
        backgroundColor: brandColors.background.secondary,
        borderColor: brandColors.border.dark,
      }}
      onPress={() => onSelect(food)}
    >
      <View className="flex-1 mr-4">
        <Text className="text-white font-bold text-base mb-1 font-display tracking-wide">
          {food.name}
        </Text>
        {match?.isMatch ? <Suggestion food={food} match={match} /> : <ServingMacros food={food} />}
      </View>

      <View
        className="w-10 h-10 rounded-full items-center justify-center border"
        style={{
          backgroundColor: brandColors.background.primary,
          borderColor: brandColors.border.dark,
        }}
      >
        <Ionicons
          name="swap-horizontal"
          size={escalar(ICON_SIZE)}
          color={brandColors.primary.start}
        />
      </View>
    </TouchableOpacity>
  );
}

function Suggestion({ food, match }: { food: FoodItem; match: FoodMatch }) {
  return (
    <View>
      <Text className="font-black text-xl italic" style={{ color: brandColors.status.success }}>
        {Math.round(match.quantity)}
        {food.serving_unit}
      </Text>
      <Text className="text-zinc-500 text-[0.625rem] uppercase tracking-widest font-black">
        SUGESTÃO EXATA
      </Text>
      {match.score > PERFECT_SCORE && (
        <LinearGradient
          colors={brandColors.gradients.primary}
          className="self-start px-3 py-1 rounded-full mt-2"
        >
          <Text className="text-white text-[0.5625rem] font-black uppercase tracking-widest">
            PERFEITO
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

function ServingMacros({ food }: { food: FoodItem }) {
  return (
    <View className="flex-row gap-4 mt-1">
      <Text className="text-zinc-500 text-[0.625rem] font-black">{food.calories} KCAL</Text>
      <Text className="text-[0.625rem] font-black" style={{ color: brandColors.macro.protein }}>
        P: {food.protein}g
      </Text>
      <Text className="text-[0.625rem] font-black" style={{ color: brandColors.macro.carbs }}>
        C: {food.carbs}g
      </Text>
      <Text className="text-[0.625rem] font-black" style={{ color: brandColors.macro.fat }}>
        G: {food.fat}g
      </Text>
    </View>
  );
}
