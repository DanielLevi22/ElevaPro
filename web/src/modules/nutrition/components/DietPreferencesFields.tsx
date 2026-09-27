"use client";

import {
  DIAS_DA_SEMANA,
  DIETARY_RESTRICTION_LABELS,
  DIETARY_RESTRICTIONS,
  type DietaryRestriction,
  type DietPlanPreferences,
} from "@elevapro/shared";

interface DietPreferencesFieldsProps {
  value: DietPlanPreferences;
  onChange: (value: DietPlanPreferences) => void;
  /** A anamnese diz algo sobre alimentação que não virou etiqueta. */
  hasOtherNotes: boolean;
}

const MEALS_PER_DAY_OPTIONS = [3, 4, 5, 6, 7, 8];

const CHIP_BASE =
  "px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const CHIP_ON = "bg-primary/10 border-primary/50 text-primary-text";
const CHIP_OFF = "bg-background border-border text-muted-foreground hover:text-foreground";

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((current) => current !== item) : [...list, item];
}

/**
 * As preferências do plano: restrições, refeições por dia, suplementos e
 * refeição livre (#337). A restrição é etiqueta de exclusão de alimento; o que
 * a anamnese diz além disso fica lá, e a tela só avisa que existe.
 *
 * @example
 * <DietPreferencesFields value={prefs} onChange={setPrefs} hasOtherNotes={hint.hasOtherNotes} />
 */
export function DietPreferencesFields({
  value,
  onChange,
  hasOtherNotes,
}: DietPreferencesFieldsProps) {
  const set = (patch: Partial<DietPlanPreferences>) => onChange({ ...value, ...patch });

  return (
    <div className="mt-3.5 space-y-5">
      <fieldset>
        <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Restrições
        </legend>
        <div className="flex flex-wrap gap-2">
          {DIETARY_RESTRICTIONS.map((tag: DietaryRestriction) => (
            <button
              key={tag}
              type="button"
              aria-pressed={value.dietary_restrictions.includes(tag)}
              onClick={() =>
                set({ dietary_restrictions: toggled(value.dietary_restrictions, tag) })
              }
              className={`${CHIP_BASE} ${value.dietary_restrictions.includes(tag) ? CHIP_ON : CHIP_OFF}`}
            >
              {DIETARY_RESTRICTION_LABELS[tag]}
            </button>
          ))}
        </div>
        {hasOtherNotes && (
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            A anamnese tem outras observações sobre alimentação. Leia antes de montar as refeições.
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Refeições por dia
          </span>
          <select
            value={value.meals_per_day ?? ""}
            onChange={(event) =>
              set({ meals_per_day: event.target.value ? Number(event.target.value) : null })
            }
            className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">Seguir a estratégia</option>
            {MEALS_PER_DAY_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} refeições
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Suplementos
          </legend>
          <div className="flex gap-2">
            {[
              { label: "Permitidos", allows: true },
              { label: "Sem suplementos", allows: false },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={value.allows_supplements === option.allows}
                onClick={() =>
                  set({
                    allows_supplements:
                      value.allows_supplements === option.allows ? null : option.allows,
                  })
                }
                className={`${CHIP_BASE} ${value.allows_supplements === option.allows ? CHIP_ON : CHIP_OFF}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Refeição livre
        </legend>
        <div className="flex flex-wrap gap-2">
          {DIAS_DA_SEMANA.map((dayName, day) => (
            <button
              key={dayName}
              type="button"
              aria-pressed={value.free_meal_days.includes(day)}
              onClick={() => set({ free_meal_days: toggled(value.free_meal_days, day) })}
              className={`${CHIP_BASE} ${value.free_meal_days.includes(day) ? CHIP_ON : CHIP_OFF}`}
            >
              {dayName}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
