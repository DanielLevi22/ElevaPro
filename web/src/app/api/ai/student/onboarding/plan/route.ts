import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { updateSessionState } from "@/modules/ai/services/chatService";
import { generatePractitionerPlan } from "@/modules/ai/services/practitionerPlan/generatePlan";
import { getOrCreateStudentCoachSession } from "@/modules/ai/services/studentCoachService";

// Duas tentativas de geração cabem com folga; 60s é o máximo do plano Hobby.
export const maxDuration = 60;

/**
 * O8 · Montando: gera o plano do onboarding do Praticante e o deixa pendente.
 *
 * Nada é gravado aqui (ADR-0020): a proposta vai para o estado da conversa do
 * coach do aluno, e só "Aprovar plano" a grava. Sem o aceite de saúde não há
 * geração: as rotas de IA do aluno exigem consentimento.
 */
async function handlePost(request: NextRequest) {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;
  const studentId = auth.caller.id;

  const outcome = await generatePractitionerPlan(studentId);
  if (!outcome.ok) {
    const status = outcome.reason === "incomplete_answers" ? 409 : 502;
    return NextResponse.json({ error: outcome.reason }, { status });
  }

  const sessionId = await getOrCreateStudentCoachSession(studentId);
  await updateSessionState(sessionId, { pendingOnboardingPlan: outcome.pending });
  return NextResponse.json({ plan: outcome.pending });
}

export const POST = withAiRoute(handlePost);
