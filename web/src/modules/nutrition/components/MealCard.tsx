"use client";

import {
  type DietMeal,
  type DietMealItem,
  type Food,
  textoDaDificuldade,
  textoDasPorcoes,
} from "@elevapro/shared";

interface MealCardProps {
  meal: DietMeal & { meal_foods?: (DietMealItem & { food: Food })[] };
  onAddFood: (mealId: string) => void;
  onEditTime: (meal: DietMeal) => void;
  onEditItem: (item: DietMealItem) => void;
  onRemoveItem: (itemId: string) => void;
  onDeleteMeal?: () => void;
}

export function MealCard({
  meal,
  onAddFood,
  onEditTime,
  onEditItem,
  onRemoveItem,
  onDeleteMeal,
}: MealCardProps) {
  const mealTotals = (meal.meal_foods || []).reduce(
    (acc, item) => {
      const ratio = item.quantity / item.food.serving_size;
      acc.calories += (item.food.calories ?? 0) * ratio;
      acc.protein += (item.food.protein ?? 0) * ratio;
      acc.carbs += (item.food.carbs ?? 0) * ratio;
      acc.fat += (item.food.fat ?? 0) * ratio;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-white/5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{meal.name}</h3>
            <button
              type="button"
              onClick={() => onEditTime(meal)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1"
            >
              <svg
                aria-hidden="true"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {rotuloDoHorarioEPreparo(meal)}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddFood(meal.id)}
              className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-bold"
            >
              + Adicionar
            </button>
            {onDeleteMeal && (
              <button
                type="button"
                onClick={onDeleteMeal}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Excluir refeição"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Meal Macros Summary View */}
        {meal.meal_foods && meal.meal_foods.length > 0 && (
          <div className="grid grid-cols-4 gap-2 bg-background/30 rounded-lg p-2 mb-3">
            <div className="text-center font-medium">
              <p className="text-[10px] text-muted-foreground uppercase">Kcal</p>
              <p className="text-sm text-foreground">{Math.round(mealTotals.calories)}</p>
            </div>
            <div className="text-center font-medium">
              <p className="text-[10px] text-muted-foreground uppercase">Prot</p>
              <p className="text-sm text-emerald-400">{Math.round(mealTotals.protein)}g</p>
            </div>
            <div className="text-center font-medium">
              <p className="text-[10px] text-muted-foreground uppercase">Carb</p>
              <p className="text-sm text-blue-400">{Math.round(mealTotals.carbs)}g</p>
            </div>
            <div className="text-center font-medium">
              <p className="text-[10px] text-muted-foreground uppercase">Gord</p>
              <p className="text-sm text-yellow-400">{Math.round(mealTotals.fat)}g</p>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-white/5">
        {meal.meal_foods?.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground italic">
            Nenhum alimento selecionado para esta refeição.
          </div>
        ) : (
          meal.meal_foods?.map((item) => {
            const ratio = item.quantity / item.food.serving_size;
            return (
              <div
                key={item.id}
                className="p-3 flex justify-between items-center hover:bg-white/5 transition-colors group"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold text-foreground truncate">{item.food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} • {Math.round((item.food.calories ?? 0) * ratio)}{" "}
                    kcal
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-[10px] text-muted-foreground hidden sm:block whitespace-nowrap">
                    <span className="text-emerald-400/80 mr-2">
                      P: {Math.round((item.food.protein ?? 0) * ratio)}g
                    </span>
                    <span className="text-blue-400/80 mr-2">
                      C: {Math.round((item.food.carbs ?? 0) * ratio)}g
                    </span>
                    <span className="text-yellow-400/80">
                      G: {Math.round((item.food.fat ?? 0) * ratio)}g
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Editar quantidade"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover alimento"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * "12:40 · 25 min · Fácil · 1 porção": o horário e o que o aluno vê do preparo,
 * para o especialista conferir sem abrir o modal.
 */
function rotuloDoHorarioEPreparo(
  meal: Pick<DietMeal, "meal_time" | "prep_minutes" | "difficulty" | "servings">,
): string {
  const partes = [
    meal.meal_time?.slice(0, 5) || "Definir horário",
    meal.prep_minutes ? `${meal.prep_minutes} min` : null,
    meal.difficulty ? textoDaDificuldade(meal.difficulty) : null,
    meal.servings ? textoDasPorcoes(meal.servings) : null,
  ];
  return partes.filter(Boolean).join(" · ");
}
