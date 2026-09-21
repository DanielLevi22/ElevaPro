import { userFacingAuthError } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Reenvia o convite de um aluno ainda `invited` (ADR-0035). Mesmo mecanismo
 * do cadastro — `inviteUserByEmail` de novo no mesmo endereço — porque o
 * GoTrue trata isso como reenvio para um usuário ainda não confirmado, não
 * como duplicata.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, account_status")
      .eq("id", studentId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    if (profile.account_status !== "invited") {
      return NextResponse.json({ error: "Este aluno já aceitou o convite." }, { status: 422 });
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
      data: { full_name: profile.full_name, account_type: "student" },
    });
    if (inviteError) {
      return NextResponse.json(
        { error: userFacingAuthError(inviteError.message) },
        { status: 422 },
      );
    }

    // Nunca e-mail nem nome no evento — o pseudônimo do titular basta.
    await recordSecurityAuditEvent({
      eventType: "identity.invite.resent",
      outcome: "succeeded",
      actorId: caller.id,
      subjectId: studentId,
      resourceType: "account",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("students.resend_invite_failed", { error });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
