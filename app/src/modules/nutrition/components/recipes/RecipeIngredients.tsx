import { Text, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import type { ListedIngredient } from '../../services/mealRecipes';

export function RecipeIngredients({ ingredients }: { ingredients: readonly ListedIngredient[] }) {
  return (
    <View className="mt-4">
      <TituloDeSecao estilo="rotulo">Suas porções</TituloDeSecao>
      {ingredients.map((ingredient) => (
        <Text key={ingredient.id} className="mb-2 text-corpo text-foreground">
          {ingredient.label}
        </Text>
      ))}
      <Text className="text-legenda text-muted-foreground">
        Use todos os itens e quantidades da lista. Não acrescente óleo, molhos ou outros alimentos
        fora dela.
      </Text>
    </View>
  );
}
