import { type SetPlan, summarizeSetPlan } from "@elevapro/shared";
import { MethodBadge } from "./MethodBadge";

/**
 * O resumo do exercício na lista: `4 séries · 10–12 reps · 60–140 kg` e as
 * técnicas usadas.
 *
 * @example <SetPlanSummaryLine plan={item.set_plan} />
 */
export function SetPlanSummaryLine({ plan }: { plan: SetPlan }) {
  const summary = summarizeSetPlan(plan);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-xs font-medium text-foreground">{summary.line}</span>
      {summary.methods.map((id) => (
        <MethodBadge key={id} method={id} />
      ))}
    </div>
  );
}
