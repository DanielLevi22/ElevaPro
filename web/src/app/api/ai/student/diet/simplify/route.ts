import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { updateSessionState } from "@/modules/ai/services/chatService";
import { prepareSimplerDiet } from "@/modules/ai/services/practitionerPlan/simplerDiet";
import { getOrCreateStudentCoachSession } from "@/modules/ai/services/studentCoachService";

// Uma geração de refeições, com uma segunda tentativa: cabe nos 60s do Hobby.
export const maxDuration = 60;

/** Sem check-in pendente ou sem o que simplificar, é conflito de estado. */
const FAILURE_STATUS = {
  no_check_in: 409,
  not_simplifiable: 409,
  no_diet: 409,
  incomplete_answers: 409,
  under_age: 403,
  plan_rejected: 502,
} as const;

/**
 * A5c · O plano mais simples (#376): o Praticante com a semana fora do plano
 * pede o cardápio com uma refeição a menos e receitas rápidas, na mesma meta.
 * Fica pendente na conversa do coach; nada é gravado (ADR-0020). Sem o aceite
 * de saúde não há geração.
 */
async function handlePost(request: NextRequest) {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { checkInId?: unknown } | null;
  if (typeof body?.checkInId !== "string") {
    return NextResponse.json(
      { error: "invalid_check_in", expected: "{ checkInId: string }" },
      { status: 400 },
    );
  }

  const outcome = await prepareSimplerDiet(auth.caller.id, body.checkInId);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.reason }, { status: FAILURE_STATUS[outcome.reason] });
  }
  const sessionId = await getOrCreateStudentCoachSession(auth.caller.id);
  await updateSessionState(sessionId, { pendingSimplerDiet: outcome.pending });
  return NextResponse.json({ diet: outcome.pending });
}

export const POST = withAiRoute(handlePost);
