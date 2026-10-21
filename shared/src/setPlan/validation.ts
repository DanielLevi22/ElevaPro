import { setPlanSchema } from "./schema";
import type { SetPlan } from "./types";

/**
 * Confere um plano de séries vindo de formulário, IA ou banco e o devolve tipado.
 * Lança com a mensagem do primeiro problema, que traz o valor recebido.
 *
 * @example validateSetPlan(JSON.parse(body.set_plan))
 */
export function validateSetPlan(input: unknown): SetPlan {
  const result = setPlanSchema.safeParse(input);
  if (result.success) return result.data as SetPlan;
  const issue = result.error.issues[0];
  const where = issue?.path.length ? ` (em ${issue.path.join(".")})` : "";
  throw new Error(`${issue?.message ?? "Plano de séries inválido."}${where}`);
}
