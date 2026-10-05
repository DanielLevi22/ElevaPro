import type { MealImage } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { RecipeFeedback } from '../components/recipes/RecipeFeedback';
import { RecipeHeader } from '../components/recipes/RecipeHeader';
import { RecipeImage } from '../components/recipes/RecipeImage';
import { RecipeIngredients } from '../components/recipes/RecipeIngredients';
import { useMealRecipes } from '../hooks/useMealRecipes';
import type { MealRecipeOption } from '../services/mealRecipes';

/** Escolher não cozinha nem registra consumo. @example <MealRecipeScreen mealId={id} date={date} /> */
export function MealRecipeScreen({ mealId, date }: { mealId: string; date: string }) {
  const router = useRouter();
  const recipes = useMealRecipes(mealId, date);
  const selected = recipes.selected;
  const openPreparation = () => {
    if (selected)
      router.push({
        pathname: ROUTES.NUTRITION.COOKING,
        params: { mealId, date, recipeId: selected.id },
      });
  };
  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        selected ? (
          <BarraDeDuasAcoes
            secundaria={{ rotulo: 'Voltar', icone: 'chevron-back', onPress: router.back }}
            principal={{ rotulo: 'Ver preparo', icone: 'book-outline', onPress: openPreparation }}
          />
        ) : undefined
      }
    >
      <RecipeHeader
        title="Cardápio"
        subtitle={recipes.context.status === 'ready' ? recipes.context.mealName : undefined}
        onBack={router.back}
      />
      {recipes.context.status !== 'ready' ? (
        <RecipeFeedback
          status={recipes.context.status}
          onRetry={
            ['error', 'consent_required'].includes(recipes.context.status)
              ? recipes.retry
              : undefined
          }
        />
      ) : (
        <>
          <Text className="mb-4 text-corpo text-muted-foreground">
            Escolha um prato com os alimentos da sua refeição. As porções continuam as mesmas.
          </Text>
          <Chip>Catálogo experimental</Chip>
          <Text className="mb-4 mt-2 text-legenda text-muted-foreground">
            Receitas ainda em teste culinário. Imagens geradas por IA são ilustrativas; siga sua
            lista de ingredientes.
          </Text>
          {recipes.match.options.length ? (
            recipes.match.options.map((option) => (
              <RecipeCard
                key={option.id}
                option={option}
                image={recipes.images.find((image) => image.id === option.imageId)}
                selected={selected?.id === option.id}
                onChoose={() => recipes.choose(option.id)}
              />
            ))
          ) : (
            <RecipeFeedback status="empty" message={recipes.match.unavailableReason ?? undefined} />
          )}
          {selected ? <RecipeIngredients ingredients={selected.ingredients} /> : null}
        </>
      )}
    </GlassScreen>
  );
}

function RecipeCard({
  option,
  image,
  selected,
  onChoose,
}: {
  option: MealRecipeOption;
  image?: MealImage;
  selected: boolean;
  onChoose: () => void;
}) {
  return (
    <View className="mb-4">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Escolher ${option.title}`}
        accessibilityState={{ selected }}
        onPress={onChoose}
        activeOpacity={0.85}
      >
        <Vidro destaque={selected}>
          <RecipeImage image={image} title={option.title} />
          <View className="p-4">
            <Text className="text-[1.125rem] font-bold text-foreground">{option.title}</Text>
            <Text className="mt-1 text-legenda text-muted-foreground">{option.description}</Text>
            <Text className="mt-3 text-legenda font-semibold text-foreground">
              {option.minutes} min · {option.equipment}
            </Text>
            <Text className="mt-3 text-legenda font-bold text-primary">
              {selected ? 'Selecionado · veja suas porções abaixo' : 'Escolher este prato'}
            </Text>
          </View>
        </Vidro>
      </TouchableOpacity>
    </View>
  );
}
