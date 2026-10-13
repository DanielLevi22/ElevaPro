import type { OnboardingAdjustment } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { getSessionState, updateSessionState } from "@/modules/ai/services/chatService";
import { adjustPractitionerPlan } from "@/modules/ai/services/practitionerPlan/adjustPlan";
import { getOrCreateStudentCoachSession } from "@/modules/ai/services/studentCoachService";

export const maxDuration = 60;

const KINDS = new Set(["swap_food", "more_protein", "cheaper", "faster", "training_days", "undo"]);
const DAYS = [2, 3, 4, 5, 6];

/** O corpo do pedido, conferido: o tipo do ajuste e, nos dias, um valor que O6 oferece. */
function readAdjustment(body: unknown): OnboardingAdjustment | null {
  const input = body as { kind?: unknown; days?: unknown } | null;
  if (!input || typeof input.kind !== "string" || !KINDS.has(input.kind)) return null;
  if (input.kind !== "training_days") return { kind: input.kind } as OnboardingAdjustment;
  return DAYS.includes(input.days as number)
    ? { kind: "training_days", days: input.days as number }
    : null;
}

/**
 * O10 · Ajustar: troca a proposta pendente por uma ajustada, guardando a
 * anterior para "Desfazer". Nada é gravado em treino ou dieta (ADR-0020).
 */
async function handlePost(request: NextRequest) {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;

  const adjustment = readAdjustment(await request.json().catch(() => null));
  if (!adjustment) {
    return NextResponse.json(
      {
        error: "invalid_adjustment",
        expected:
          "kind em swap_food, more_protein, cheaper, faster, training_days (days 2–6), undo",
      },
      { status: 400 },
    );
  }

  const sessionId = await getOrCreateStudentCoachSession(auth.caller.id);
  const { pendingOnboardingPlan: pending, previousOnboardingPlan: previous } =
    await getSessionState(sessionId);
  if (!pending) return NextResponse.json({ error: "no_pending_plan" }, { status: 409 });

  if (adjustment.kind === "undo") {
    if (!previous) return NextResponse.json({ error: "nothing_to_undo" }, { status: 409 });
    await updateSessionState(sessionId, {
      pendingOnboardingPlan: previous,
      previousOnboardingPlan: null,
    });
    return NextResponse.json({ plan: previous, canUndo: false });
  }

  const outcome = await adjustPractitionerPlan(auth.caller.id, pending, adjustment);
  if (!outcome.ok) {
    // Sem idade de adulto é recusa (403), como na geração; o resto é conflito de estado.
    const status = { plan_rejected: 502, under_age: 403 }[outcome.reason as string] ?? 409;
    return NextResponse.json({ error: outcome.reason }, { status });
  }
  await updateSessionState(sessionId, {
    pendingOnboardingPlan: outcome.pending,
    previousOnboardingPlan: pending,
  });
  return NextResponse.json({ plan: outcome.pending, canUndo: true });
}

export const POST = withAiRoute(handlePost);
