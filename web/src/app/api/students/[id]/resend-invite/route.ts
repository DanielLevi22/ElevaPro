import { userFacingAuthError } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId, traceIdForRequest } from "@/lib/trace";

/**
 * Reenvia o convite de um aluno ainda `invited` (ADR-0035). Mesmo mecanismo
 * do cadastro — `inviteUserByEmail` de novo no mesmo endereço — porque o
 * GoTrue trata isso como reenvio para um usuário ainda não confirmado, não
 * como duplicata.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = traceIdForRequest(request);
  try {
    const { id: studentId } = await params;
    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return attachTraceId(auth.response, traceId);
    const caller = auth.caller;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, account_status")
      .eq("id", studentId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
      return attachTraceId(
        NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 }),
        traceId,
      );
    }

    if (profile.account_status !== "invited") {
      return attachTraceId(
        NextResponse.json({ error: "Este aluno já aceitou o convite." }, { status: 422 }),
        traceId,
      );
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
      data: { full_name: profile.full_name, account_type: "student" },
      redirectTo: new URL("/auth/reset-password", request.url).toString(),
    });
    if (inviteError) {
      logger.warn("students.resend_invite_rejected", { error: inviteError, traceId });
      return attachTraceId(
        NextResponse.json({ error: userFacingAuthError(inviteError.message) }, { status: 422 }),
        traceId,
      );
    }

    // Nunca e-mail nem nome no evento — o pseudônimo do titular basta.
    await recordSecurityAuditEvent({
      eventType: "identity.invite.resent",
      outcome: "succeeded",
      actorId: caller.id,
      subjectId: studentId,
      resourceType: "account",
      traceId,
    });

    return attachTraceId(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    logger.error("students.resend_invite_failed", { error, traceId });
    return attachTraceId(
      NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 }),
      traceId,
    );
  }
}
