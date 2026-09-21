import { type NextRequest, NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";
import { recordSecurityAuditEvent } from "@/lib/security-audit";

/**
 * Registra que o titular trocou a sessão de convite/recuperação pela própria
 * senha (ADR-0035). Não faz nada além disso — a troca de senha em si já
 * aconteceu no cliente, direto no Supabase Auth.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;

  await recordSecurityAuditEvent({
    eventType: "identity.invite.accepted",
    outcome: "succeeded",
    actorId: auth.caller.id,
    subjectId: auth.caller.id,
    resourceType: "account",
  });

  return NextResponse.json({ success: true });
}
