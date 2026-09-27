import {
  DIAS_DA_SEMANA,
  DIETARY_RESTRICTION_LABELS,
  DIETARY_RESTRICTIONS,
  type DietPlanPreferences,
} from '@elevapro/shared';
import { Text, View } from 'react-native';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { StepButton } from './StepButton';
import { ToggleChip } from './ToggleChip';

/**
 * As "Preferências" do kit (tela 17): restrições, suplementos, refeições por
 * dia e os dias de refeição livre. A restrição é etiqueta de exclusão de
 * alimento; o que a anamnese diz além disso só é apontado (LGPD, #337).
 *
 * @example <DietPreferencesPanel value={prefs} onChange={setPrefs} hasOtherNotes={false} />
 */
interface DietPreferencesPanelProps {
  value: DietPlanPreferences;
  onChange: (value: DietPlanPreferences) => void;
  hasOtherNotes: boolean;
}

const MIN_MEALS = 1;
const MAX_MEALS = 8;
// Sem preferência, o "+" parte das quatro refeições da estratégia padrão.
const STRATEGY_MEALS = 4;
const SHORT_DAY = DIAS_DA_SEMANA.map((name) => name.slice(0, 3));

function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((current) => current !== item) : [...list, item];
}

function clampMeals(value: number): number {
  return Math.min(MAX_MEALS, Math.max(MIN_MEALS, value));
}

export function DietPreferencesPanel({
  value,
  onChange,
  hasOtherNotes,
}: DietPreferencesPanelProps) {
  const set = (patch: Partial<DietPlanPreferences>) => onChange({ ...value, ...patch });
  const meals = value.meals_per_day;

  return (
    <Vidro className="p-3.5">
      <View className="flex-row flex-wrap gap-2">
        {DIETARY_RESTRICTIONS.map((tag) => (
          <ToggleChip
            key={tag}
            active={value.dietary_restrictions.includes(tag)}
            onPress={() => set({ dietary_restrictions: toggled(value.dietary_restrictions, tag) })}
          >
            {DIETARY_RESTRICTION_LABELS[tag]}
          </ToggleChip>
        ))}
        <ToggleChip
          active={value.allows_supplements === false}
          onPress={() =>
            set({ allows_supplements: value.allows_supplements === false ? null : false })
          }
        >
          Sem suplementos
        </ToggleChip>
      </View>
      {hasOtherNotes && (
        <InfoNote icon="document-text-outline" className="mt-3">
          A anamnese tem outras observações sobre alimentação. Leia antes de montar as refeições.
        </InfoNote>
      )}

      <View className="mt-3.5 flex-row items-center justify-between">
        <Text className="text-[0.8125rem] font-semibold text-foreground">Refeições por dia</Text>
        <View className="flex-row items-center gap-2">
          <StepButton
            direction="down"
            label="Menos refeições"
            onPress={() => set({ meals_per_day: meals === null ? null : clampMeals(meals - 1) })}
          />
          <Text className="w-[4.5rem] text-center text-[0.8125rem] font-bold text-foreground">
            {meals === null ? 'Estratégia' : `${meals}`}
          </Text>
          <StepButton
            direction="up"
            label="Mais refeições"
            onPress={() => set({ meals_per_day: clampMeals((meals ?? STRATEGY_MEALS) + 1) })}
          />
        </View>
      </View>

      <Text className="mb-2 mt-3.5 pl-0.5 text-[0.65625rem] font-bold uppercase tracking-wider text-placeholder">
        Dias de refeição livre
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {SHORT_DAY.map((name, day) => (
          <ToggleChip
            key={name}
            active={value.free_meal_days.includes(day)}
            onPress={() => set({ free_meal_days: toggled(value.free_meal_days, day) })}
          >
            {name}
          </ToggleChip>
        ))}
      </View>
    </Vidro>
  );
}
