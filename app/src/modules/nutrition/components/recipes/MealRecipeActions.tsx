import { useRouter } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CookingPot from 'lucide-react-native/icons/cooking-pot';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';

interface MealActionCardProps {
  title: string;
  description: string;
  accessibilityLabel: string;
  icon: typeof BookOpen;
  featured?: boolean;
  onPress: () => void;
}

/** Duas intenções distintas: escolher prato e consultar preparo. @example <MealRecipeActions mealId={id} date={date} /> */
export function MealRecipeActions({ mealId, date }: { mealId: string; date: string }) {
  const router = useRouter();
  const canRead = useAuthStore((state) => state.abilities?.can('read', 'Diet') ?? false);
  if (!canRead) return null;
  return (
    <View className="my-4 flex-row gap-3">
      <MealActionCard
        title="Cardápio"
        description="Variações da sua refeição"
        accessibilityLabel="Abrir cardápio"
        icon={BookOpen}
        featured
        onPress={() =>
          router.push({ pathname: ROUTES.NUTRITION.RECIPES, params: { mealId, date } })
        }
      />
      <MealActionCard
        title="Modo de preparo"
        description="Siga o passo a passo"
        accessibilityLabel="Abrir modo de preparo"
        icon={CookingPot}
        onPress={() =>
          router.push({ pathname: ROUTES.NUTRITION.COOKING, params: { mealId, date } })
        }
      />
    </View>
  );
}

function MealActionCard({
  title,
  description,
  accessibilityLabel,
  icon: Icon,
  featured = false,
  onPress,
}: MealActionCardProps) {
  const colors = useCores();
  const scale = useEscala();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={description}
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-1"
    >
      <Vidro className="min-h-[8rem] p-3.5">
        <View className="mb-3 flex-row items-center justify-between">
          <View
            className={
              featured
                ? 'h-[2.5rem] w-[2.5rem] items-center justify-center rounded-2xl bg-primary'
                : 'h-[2.5rem] w-[2.5rem] items-center justify-center rounded-2xl bg-primary/10'
            }
          >
            <Icon
              accessible={false}
              size={scale(22)}
              strokeWidth={1.75}
              color={featured ? colors.primaryForeground : colors.primaryText}
            />
          </View>
          <ChevronRight
            accessible={false}
            size={scale(16)}
            strokeWidth={1.75}
            color={colors.mutedForeground}
          />
        </View>
        <Text className="text-[0.9375rem] font-bold leading-[1.25rem] text-foreground">
          {title}
        </Text>
        <Text className="mt-1.5 text-[0.75rem] leading-[1.0625rem] text-muted-foreground">
          {description}
        </Text>
      </Vidro>
    </TouchableOpacity>
  );
}
