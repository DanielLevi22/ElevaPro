/**
 * As restrições do plano de dieta: vocabulário fechado de exclusão de alimento
 * (#337). O banco recusa qualquer outro valor (`0074`).
 *
 * A etiqueta nasce da anamnese, mas não é a anamnese: "Diabetes" e "Outra"
 * ficam de fora de propósito (LGPD_COMPLIANCE.md §2.2). Diagnóstico mora só na
 * anamnese; o plano guarda o que ele exclui.
 */

export const DIETARY_RESTRICTIONS = ["lactose_free", "gluten_free", "vegetarian", "vegan"] as const;

export type DietaryRestriction = (typeof DIETARY_RESTRICTIONS)[number];

export const DIETARY_RESTRICTION_LABELS: Record<DietaryRestriction, string> = {
  lactose_free: "Sem lactose",
  gluten_free: "Sem glúten",
  vegetarian: "Vegetariana",
  vegan: "Vegana",
};

// As opções da pergunta `dietary_restrictions` de `anamnesisQuestions.ts`.
const FROM_ANAMNESIS: Record<string, DietaryRestriction> = {
  "Intolerante a Lactose": "lactose_free",
  "Intolerante a Glúten": "gluten_free",
  Vegetariano: "vegetarian",
  Vegano: "vegan",
};

const NO_RESTRICTION = "Nenhuma";

function answersOf(answer: unknown): string[] {
  const list = Array.isArray(answer) ? answer : [answer];
  return list.filter((item): item is string => typeof item === "string");
}

/**
 * As etiquetas que a resposta da anamnese sugere para o plano.
 *
 * @example
 * restrictionsFromAnamnesis(["Diabetes", "Intolerante a Lactose"]); // ["lactose_free"]
 */
export function restrictionsFromAnamnesis(answer: unknown): DietaryRestriction[] {
  const tags = answersOf(answer)
    .map((item) => FROM_ANAMNESIS[item])
    .filter((tag): tag is DietaryRestriction => tag !== undefined);
  return [...new Set(tags)];
}

/**
 * Se a anamnese diz algo sobre alimentação que não virou etiqueta. A tela usa
 * isso para mandar o especialista ler a anamnese, sem repetir o que ela diz.
 *
 * @example
 * hasUnmappedDietaryNotes(["Diabetes"]); // true
 */
export function hasUnmappedDietaryNotes(answer: unknown): boolean {
  return answersOf(answer).some((item) => item !== NO_RESTRICTION && !(item in FROM_ANAMNESIS));
}
