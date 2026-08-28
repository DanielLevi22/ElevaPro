import type { Food } from "@elevapro/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFoods } from "@/shared/hooks/useNutrition";

const CALC_ONBOARDING_KEY = "nutrition_calc_onboarding_seen";

interface FoodSelectorProps {
  onSelect: (food: Food, quantity?: number) => void;
}

type MacroType = "protein" | "carbs" | "fat" | "calories";

interface MacroTargets {
  protein?: string;
  carbs?: string;
  fat?: string;
  calories?: string;
}

export function FoodSelector({ onSelect }: FoodSelectorProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Reverse Calculator State
  const [targets, setTargets] = useState<MacroTargets>({});
  const [activeMacros, setActiveMacros] = useState<MacroType[]>([]);
  const [showCalcOnboarding, setShowCalcOnboarding] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(CALC_ONBOARDING_KEY),
  );

  const dismissCalcOnboarding = () => {
    localStorage.setItem(CALC_ONBOARDING_KEY, "1");
    setShowCalcOnboarding(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { data: foods = [], isLoading } = useFoods(debouncedSearch);

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

  // Sem `useCallback` a função nascia nova a cada render, e o `useMemo` que a
  // tem como dependência recalculava a ordenação da lista inteira em todo
  // render — justamente o trabalho que o memo existe para evitar.
  const calculateMatch = useCallback(
    (food: Food) => {
      if (activeMacros.length === 0) return null;

      const quantities: number[] = [];
      let validTargets = 0;

      for (const macro of activeMacros) {
        const targetVal = parseFloat(targets[macro] || "0");
        if (targetVal > 0) {
          const foodVal = food[macro as keyof Food] as number;
          if (foodVal > 0) {
            quantities.push((targetVal / foodVal) * food.serving_size);
            validTargets++;
          } else {
            quantities.push(Infinity);
            validTargets++;
          }
        }
      }

      if (validTargets === 0) return null;

      if (quantities.some((q) => q === Infinity)) {
        return { quantity: 0, score: 0, isMatch: false };
      }

      const avgQuantity = quantities.reduce((a, b) => a + b, 0) / quantities.length;
      const variance =
        quantities.reduce((acc, q) => acc + (q - avgQuantity) ** 2, 0) / quantities.length;
      const score = 100 / (1 + variance / 1000);

      return {
        quantity: avgQuantity,
        score,
        isMatch: true,
      };
    },
    [activeMacros, targets],
  );

  const sortedFoods = useMemo(() => {
    if (activeMacros.length === 0) return foods;

    return [...foods].sort((a, b) => {
      const matchA = calculateMatch(a);
      const matchB = calculateMatch(b);

      const scoreA = matchA?.isMatch ? matchA.score : -1;
      const scoreB = matchB?.isMatch ? matchB.score : -1;

      return scoreB - scoreA;
    });
  }, [foods, activeMacros, calculateMatch]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar alimentos..."
          className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 pl-10 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <svg
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Reverse Calculator */}
      <div className="bg-background/50 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Calculadora Reversa (Multimeta)
          </p>
          {!showCalcOnboarding && (
            <button
              type="button"
              onClick={() => setShowCalcOnboarding(true)}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              Como funciona?
            </button>
          )}
        </div>

        {showCalcOnboarding && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                Como funciona a Calculadora Reversa
              </p>
              <button
                type="button"
                onClick={dismissCalcOnboarding}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {[
                {
                  icon: "1️⃣",
                  text: "Ative os macros que quer atingir nessa refeição (ex: Prot + Carb)",
                },
                { icon: "2️⃣", text: "Digite a meta em gramas ou kcal para cada macro ativado" },
                {
                  icon: "3️⃣",
                  text: "A calculadora encontra a quantidade ideal de cada alimento e exibe o score:",
                },
              ].map((item) => (
                <p key={item.icon} className="text-[11px] text-muted-foreground flex gap-2">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </p>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Combinação Perfeita", color: "bg-emerald-500/20 text-emerald-400" },
                { label: "Boa Combinação", color: "bg-yellow-500/20 text-yellow-400" },
                { label: "Baixa Combinação", color: "bg-orange-500/20 text-orange-400" },
              ].map((s) => (
                <span
                  key={s.label}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md ${s.color}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={dismissCalcOnboarding}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Entendi, não mostrar novamente
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(["protein", "carbs", "fat", "calories"] as const).map((macro) => (
            <div
              key={macro}
              className={`flex items-center rounded-lg border transition-all overflow-hidden ${
                activeMacros.includes(macro)
                  ? "bg-primary/10 border-primary"
                  : "bg-background border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleMacro(macro)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeMacros.includes(macro)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {macro === "protein"
                  ? "Prot"
                  : macro === "carbs"
                    ? "Carb"
                    : macro === "fat"
                      ? "Gord"
                      : "Kcal"}
              </button>

              {activeMacros.includes(macro) && (
                <input
                  type="number"
                  value={targets[macro] || ""}
                  onChange={(e) => updateTarget(macro, e.target.value)}
                  placeholder="0"
                  className="w-16 bg-transparent border-l border-primary/20 py-1 px-2 text-sm text-center text-foreground focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar pr-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Carregando...
          </div>
        ) : sortedFoods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "Nenhum alimento encontrado" : "Digite para buscar"}
          </div>
        ) : (
          sortedFoods.map((food) => {
            const match = calculateMatch(food);

            return (
              <button
                type="button"
                key={food.id}
                onClick={() => onSelect(food, match?.isMatch ? match.quantity : undefined)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
              >
                {match?.isMatch && (
                  <div
                    className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold rounded-bl-lg ${
                      match.score > 80
                        ? "bg-emerald-500/20 text-emerald-500"
                        : match.score > 40
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-orange-500/20 text-orange-500"
                    }`}
                  >
                    {match.score > 80
                      ? "Combinação Perfeita"
                      : match.score > 40
                        ? "Boa Combinação"
                        : "Baixa Combinação"}
                  </div>
                )}

                <div className="flex justify-between items-start pr-16">
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {food.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{food.category}</p>
                  </div>
                </div>

                {match?.isMatch ? (
                  <div className="mt-3 bg-background/50 rounded p-2 border border-white/5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-bold text-primary">
                        {Math.round(match.quantity)}
                        {food.serving_unit}
                      </span>
                      <span className="text-xs text-muted-foreground">para atingir metas</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {activeMacros.map((macro) => {
                        const val =
                          (Number(food[macro as keyof Food]) * match.quantity) / food.serving_size;
                        const target = parseFloat(targets[macro] || "0");
                        return (
                          <span key={macro}>
                            {macro === "calories"
                              ? "Kcal"
                              : macro.charAt(0).toUpperCase() + macro.slice(1, 3)}
                            :
                            <span
                              className={
                                val > target * 1.1
                                  ? "text-red-400"
                                  : val < target * 0.9
                                    ? "text-yellow-400"
                                    : "text-emerald-400"
                              }
                            >
                              {" "}
                              {Math.round(val)}/{Math.round(target)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-3 text-xs">
                    <span className="text-muted-foreground">{food.calories}kcal</span>
                    <span className="text-emerald-400">P: {food.protein}g</span>
                    <span className="text-blue-400">C: {food.carbs}g</span>
                    <span className="text-yellow-400">G: {food.fat}g</span>
                    <span className="text-muted-foreground ml-auto">
                      por {food.serving_size}
                      {food.serving_unit}
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
