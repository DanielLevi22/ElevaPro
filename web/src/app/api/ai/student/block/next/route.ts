import { BLOCK_CHANGES_FORMAT, localDateOf, readBlockChanges } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { updateSessionState } from "@/modules/ai/services/chatService";
import { prepareNextBlock } from "@/modules/ai/services/practitionerPlan/nextBlock";
import { getOrCreateStudentCoachSession } from "@/modules/ai/services/studentCoachService";

// Duas tentativas de geração cabem com folga; 60s é o máximo do plano Hobby.
export const maxDuration = 60;

/** Sem bloco, ou bloco ainda correndo, é conflito de estado; menor de idade é recusa. */
const FAILURE_STATUS = {
  no_block: 409,
  block_running: 409,
  level_not_available: 409,
  incomplete_answers: 409,
  under_age: 403,
  plan_rejected: 502,
} as const;

/**
 * B3 · Montando o próximo bloco (#376): o Praticante cujo bloco acabou manda o
 * que mudou na reavaliação, e o próximo bloco fica pendente na conversa do
 * coach. Nada é gravado aqui, nem a anamnese (ADR-0020). Sem o aceite de saúde
 * não há geração: as rotas de IA do aluno exigem consentimento.
 */
async function handlePost(request: NextRequest) {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { changes?: unknown } | null;
  const changes = readBlockChanges(body?.changes);
  if (!changes) {
    return NextResponse.json(
      { error: "invalid_changes", expected: BLOCK_CHANGES_FORMAT },
      { status: 400 },
    );
  }

  const outcome = await prepareNextBlock(auth.caller.id, changes, localDateOf(new Date()));
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.reason }, { status: FAILURE_STATUS[outcome.reason] });
  }
  const sessionId = await getOrCreateStudentCoachSession(auth.caller.id);
  await updateSessionState(sessionId, { pendingNextBlock: outcome.pending });
  return NextResponse.json({ block: outcome.pending });
}

export const POST = withAiRoute(handlePost);
