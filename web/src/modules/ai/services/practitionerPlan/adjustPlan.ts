import type { OnboardingAdjustment, OnboardingPlanPending } from "@elevapro/shared";
import { moreProtein, swapFood } from "./adjustments";
import { type GenerationOutcome, generatePractitionerPlan, loadPlanFoods } from "./generatePlan";
import { readPlanChoices } from "./planChoices";

/** O que a IA recebe em "Mais barato" e "Mais rápido": sem dado, ela estima. */
const CHEAPER =
  "Prefira alimentos mais baratos e comuns no Brasil (feijão, ovo, frango, arroz, banana, legumes da estação).";
/** Também o plano mais simples do check-in (A5c). */
export const FASTER =
  "Prefira refeições de preparo rápido, de até 15 minutos, ou que não precisem de fogão.";

export type AdjustmentOutcome = GenerationOutcome | { ok: false; reason: "nothing_to_adjust" };

/**
 * Aplica um ajuste de O10 sobre o plano pendente e devolve a nova proposta.
 * Nada é gravado: a nova versão substitui a pendente, e "Aprovar plano" grava a
 * que estiver na tela (ADR-0020).
 *
 * Trocar alimento é conta no banco, sem IA. Mais proteína troca carboidrato por
 * proteína sem mexer nas calorias, e a IA remonta as refeições. Dias novos
 * recalculam a meta pelo código e remontam tudo.
 *
 * @example const outcome = await adjustPractitionerPlan(user.id, pendente, { kind: "cheaper" });
 */
export async function adjustPractitionerPlan(
  studentId: string,
  pending: OnboardingPlanPending,
  adjustment: Exclude<OnboardingAdjustment, { kind: "undo" }>,
): Promise<AdjustmentOutcome> {
  const keepWorkouts = pending.proposal.workouts;
  const days = { training_days: pending.trainingDays };

  switch (adjustment.kind) {
    case "swap_food":
      return swapSuggested(pending);
    case "more_protein": {
      const target = moreProtein(pending.target);
      if (!target) return { ok: false, reason: "nothing_to_adjust" };
      return generatePractitionerPlan(studentId, {
        answersOverride: days,
        targetOverride: target,
        keepWorkouts,
      });
    }
    case "cheaper":
    case "faster":
      if (!pending.target) return { ok: false, reason: "nothing_to_adjust" };
      return generatePractitionerPlan(studentId, {
        answersOverride: days,
        targetOverride: pending.target,
        keepWorkouts,
        dietInstruction: adjustment.kind === "cheaper" ? CHEAPER : FASTER,
        estimate: adjustment.kind,
      });
    case "training_days":
      return generatePractitionerPlan(studentId, {
        answersOverride: { training_days: adjustment.days },
      });
  }
}

async function swapSuggested(pending: OnboardingPlanPending): Promise<AdjustmentOutcome> {
  if (!pending.suggestedSwap) return { ok: false, reason: "nothing_to_adjust" };
  // A troca foi escolhida na geração, já dentro das exclusões; aqui só faltam as
  // calorias dos dois alimentos, e o banco sem filtro (as escolhas padrão) as tem.
  const foods = await loadPlanFoods(readPlanChoices({}));
  const swapped = swapFood(pending, pending.suggestedSwap, foods);
  return { ok: true, pending: { ...swapped, suggestedSwap: null, estimate: pending.estimate } };
}
