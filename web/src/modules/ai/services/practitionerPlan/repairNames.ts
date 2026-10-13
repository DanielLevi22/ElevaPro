import type { PractitionerPlanProposal } from "@elevapro/shared";

const COMBINING_MARKS = /[̀-ͯ]/g;
const normalize = (text: string) =>
  text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();

/**
 * O nome que a IA escreveu, trocado pelo da lista quando só um combina. A IA
 * encurta ("Desenvolvimento com halteres" no lugar de "…com halteres sentado")
 * e enfeita ("Salada de alface"), e recusar por isso desperdiçava a geração.
 *
 * Só aponta para nomes da lista permitida: alimento excluído não entra por
 * aqui. Ambíguo ou sem par continua como veio, e a conferência recusa.
 *
 * @example resolveName("Salada de alface", ["Alface", "Arroz"]) // "Alface"
 */
export function resolveName(name: string, allowed: readonly string[]): string {
  const wanted = normalize(name);
  const exact = allowed.find((item) => normalize(item) === wanted);
  if (exact) return exact;
  const matches = allowed.filter((item) => {
    const candidate = normalize(item);
    return (
      candidate.startsWith(wanted) || new RegExp(`\\b${escapeRegExp(candidate)}\\b`).test(wanted)
    );
  });
  return matches.length === 1 ? matches[0] : name;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Aplica `resolveName` a todo exercício e alimento do plano.
 *
 * @example const reparado = repairNames(proposta, exercicios, alimentos);
 */
export function repairNames(
  plan: PractitionerPlanProposal,
  exercises: readonly string[],
  foods: readonly string[],
): PractitionerPlanProposal {
  return {
    ...plan,
    workouts: plan.workouts.map((workout) => ({
      ...workout,
      exercises: workout.exercises.map((item) => ({
        ...item,
        exercise_name: resolveName(item.exercise_name, exercises),
      })),
    })),
    meals:
      plan.meals?.map((meal) => ({
        ...meal,
        items: meal.items.map((item) => ({
          ...item,
          food_name: resolveName(item.food_name, foods),
        })),
      })) ?? null,
  };
}
