import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import type { PlanMeal } from '../../hooks/useDietPlanEditor';
import { macrosDosItens, numeroDoBanco } from '../../services/consumoDoDia';

/**
 * Um alimento da refeição sendo montada: nome, kcal na quantidade atual, o
 * campo da quantidade e o "tirar". A quantidade grava quando o campo perde o
 * foco, não a cada tecla.
 *
 * @example <MealItemRow item={item} onQuantity={mudar} onRemove={tirar} />
 */
interface MealItemRowProps {
  item: PlanMeal['diet_meal_items'][number];
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

const ICON_SIZE = 17;

export function MealItemRow({ item, onQuantity, onRemove }: MealItemRowProps) {
  const cores = useCores();
  const escalar = useEscala();
  const saved = numeroDoBanco(item.quantity);
  const [text, setText] = useState(String(saved));
  const kcal = Math.round(macrosDosItens([item]).calorias);

  function commit() {
    const quantity = Number(text.replace(',', '.'));
    if (Number.isFinite(quantity) && quantity > 0 && quantity !== saved) onQuantity(quantity);
    else setText(String(saved));
  }

  return (
    <Vidro classeExterna="mb-2" className="flex-row items-center gap-3 p-3">
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[0.84375rem] font-semibold text-foreground">
          {item.food?.name ?? 'Alimento'}
        </Text>
        <Text className="text-[0.6875rem] text-muted-foreground">{`${kcal} kcal`}</Text>
      </View>
      <View className="h-9 w-[4.75rem] flex-row items-center rounded-[0.75rem] border border-glass-border bg-glass-strong px-2">
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={commit}
          keyboardType="decimal-pad"
          accessibilityLabel={`Quantidade de ${item.food?.name ?? 'alimento'}`}
          className="min-w-0 flex-1 text-right text-[0.8125rem] font-bold text-foreground"
        />
        <Text className="ml-1 text-[0.6875rem] text-placeholder">{item.unit}</Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Tirar ${item.food?.name ?? 'alimento'}`}
      >
        <Ionicons name="trash-outline" size={escalar(ICON_SIZE)} color={cores.placeholder} />
      </TouchableOpacity>
    </Vidro>
  );
}
