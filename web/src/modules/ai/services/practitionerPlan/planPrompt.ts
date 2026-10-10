import type { PlanChoices } from "./planChoices";

type Track = "beginner" | "returning" | "intermediate" | "advanced";

export interface PlanPromptInput {
  /** Opção de `main_goal`. */
  goal: string;
  level: Track;
  choices: PlanChoices;
  /** A meta do código (`practitionerDietTarget`); `null` quando não há dieta. */
  target: { calories: number; protein: number; carbs: number; fat: number } | null;
  injuryReported: boolean;
  /** Os exercícios do local, já filtrados. */
  exercises: readonly string[];
  /** Os alimentos permitidos, com as calorias da porção: "Arroz branco cozido — 130 kcal por 100 g". */
  foods: readonly string[];
  /** Uma preferência extra para a dieta, vinda de O10 ("mais barato", "mais rápido"). */
  dietInstruction?: string;
  /** O treino já está aprovado na tela: pede só as refeições. */
  mealsOnly?: boolean;
}

const LEVEL: Record<Track, string> = {
  beginner: "iniciante",
  returning: "voltando a treinar",
  intermediate: "intermediário",
  advanced: "avançado",
};

/**
 * As faixas de treino da pesquisa (`docs/research/regras-prescricao-praticante.md`).
 * Provisórias até a validação do CREF (ADR-0044): a IA escolhe dentro delas.
 */
const TRAINING_RANGES = `- Cada grupo muscular grande treinado cerca de 2 vezes por semana (OMS 2020; Schoenfeld 2016).
- Volume semanal por grupo: iniciante e voltando, 6 a 10 séries; intermediário, 10 a 15; avançado, 12 a 20.
- Repetições: 8 a 12 para iniciante; 6 a 15 para os demais. Intervalo de 60 a 120 segundos.
- Nunca até a falha: pare com 1 a 3 repetições sobrando.`;

/**
 * O pedido à IA: montar treino e refeições **dentro** das escolhas e da meta.
 *
 * Leva só o necessário para escolher exercícios e alimentos (Art. 6°, III). O
 * corpo da pessoa e a triagem ficam no servidor: a meta já foi calculada com
 * eles. A lesão relatada vira uma regra de treino, sem nomear a lesão.
 *
 * @example const prompt = buildPlanPrompt({ goal, level, choices, target, injuryReported, exercises, foods });
 */
export function buildPlanPrompt(input: PlanPromptInput): string {
  const { choices } = input;
  return [
    `Monte o plano semanal de um app de treino. Objetivo: ${input.goal}. Nível de treino: ${LEVEL[input.level]}.`,
    input.mealsOnly
      ? 'Monte SÓ as refeições; o treino já está pronto. Responda com "workouts": [].'
      : trainingSection(input),
    input.target
      ? dietSection(input)
      : 'SEM DIETA: não monte refeições. Responda com "meals": null.',
    responseFormat(),
  ].join("\n\n");

  function trainingSection({ exercises, injuryReported }: PlanPromptInput): string {
    const sports = choices.sports.length
      ? `Inclua EXATAMENTE ${choices.sports.length} sessão(ões) opcional(is) (optional: true), uma por esporte praticado: ${choices.sports.join(", ")}. Nenhuma outra sessão opcional; os dias sem treino ficam livres. Elas não contam nos ${choices.trainingDays} treinos.`
      : "Não inclua sessão opcional.";
    const cuidado = injuryReported
      ? "\n- Prefira variações de baixo impacto e cargas moderadas; evite carga axial pesada e saltos."
      : "";
    return `TREINO
- Exatamente ${choices.trainingDays} treinos por semana, em dias diferentes, cada um com até ${choices.sessionMinutes} minutos.
${TRAINING_RANGES}${cuidado}
- ${sports}
- Use APENAS exercícios desta lista, com o nome exatamente como está:
${exercises.join("\n")}`;
  }

  function dietSection({ target, foods, dietInstruction }: PlanPromptInput): string {
    const meta = target as NonNullable<PlanPromptInput["target"]>;
    const budget = choices.foodBudget ? ` Orçamento: ${choices.foodBudget}.` : "";
    const preference = dietInstruction ? `\n- ${dietInstruction}` : "";
    return `ALIMENTAÇÃO
- Meta do dia, calculada pelo app e que você não pode mudar: ${meta.calories} kcal, ${meta.protein} g de proteína, ${meta.carbs} g de carboidrato, ${meta.fat} g de gordura. A soma do dia deve ficar a até 5% das calorias.
- Exatamente ${choices.mealsPerDay} refeições por dia, com em média ${Math.round(meta.calories / choices.mealsPerDay)} kcal cada; nenhuma refeição com menos da metade disso.${budget}
- Comida brasileira do dia a dia, em porções realistas.${preference}
- Use APENAS alimentos desta lista, com o nome exatamente como está antes do travessão. A quantidade é SEMPRE em gramas (ex.: 150 para 150 g de arroz), nunca em porções:
${foods.join("\n")}`;
  }
}

function responseFormat(): string {
  return `Responda APENAS com JSON válido, sem texto fora dele:
{
  "workouts": [{ "title": string, "day_of_week": "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday", "muscle_group": string, "optional": boolean,
    "exercises": [{ "exercise_name": string, "sets": number, "reps": string, "rest_seconds": number }] }],
  "meals": [{ "name": string, "meal_time": "HH:MM", "items": [{ "food_name": string, "quantity": number }] }] | null,
  "explanation": string (2 a 3 frases explicando as escolhas, sem números de meta)
}`;
}
