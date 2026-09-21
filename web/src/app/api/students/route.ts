import { userFacingAuthError } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeSpecialist(request);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const body = await request.json();
    const { fullName, email, serviceTypes } = body;

    if (!fullName || !email || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return NextResponse.json(
        { error: "fullName, email e serviceTypes são obrigatórios" },
        { status: 400 },
      );
    }

    // O tipo de acompanhamento é escolha do especialista, mas só entre os
    // serviços que ele próprio presta — o cliente escolhe o quê, nunca se o
    // especialista está autorizado a prestar aquele serviço.
    const { data: offeredServices } = await supabaseAdmin
      .from("specialist_services")
      .select("service_type")
      .eq("specialist_id", caller.id);

    const offered = new Set(
      (offeredServices ?? []).map((s: { service_type: string }) => s.service_type),
    );
    const unauthorized = serviceTypes.find((type: string) => !offered.has(type));
    if (unauthorized) {
      return NextResponse.json(
        { error: `Você não presta o serviço "${unauthorized}"` },
        { status: 422 },
      );
    }

    // ADR-0035: o Specialist convida, o Student define a própria senha. Uma
    // senha é prova de autenticação do titular de uma conta que guarda dado
    // de saúde, não algo combinado entre duas pessoas.
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: fullName, account_type: "student" } },
    );

    if (inviteError) {
      const message =
        inviteError.message.includes("already registered") || inviteError.code === "email_exists"
          ? "Email já cadastrado"
          : userFacingAuthError(inviteError.message);
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const studentId = invited.user.id;

    await supabaseAdmin.from("profiles" as never).upsert(
      {
        id: studentId,
        email,
        full_name: fullName,
        account_type: "student",
        account_status: "invited",
      } as never,
      { onConflict: "id" },
    );

    const links = serviceTypes.map((service_type: string) => ({
      student_id: studentId,
      specialist_id: caller.id,
      service_type,
      status: "active",
    }));

    const { error: linkError } = await supabaseAdmin
      .from("student_specialists" as never)
      .upsert(links as never[], {
        onConflict: "student_id,specialist_id,service_type",
        ignoreDuplicates: true,
      });

    if (linkError) {
      logger.error("students.link_failed", { error: linkError });
      return NextResponse.json(
        { error: "Erro ao vincular aluno ao especialista" },
        { status: 500 },
      );
    }

    // Nunca e-mail nem nome no evento: o pseudônimo do titular basta para
    // investigar, e um segundo acervo de dado pessoal não deveria existir só
    // porque "pode ajudar a auditar depois".
    await recordSecurityAuditEvent({
      eventType: "identity.invite.sent",
      outcome: "succeeded",
      actorId: caller.id,
      subjectId: studentId,
      resourceType: "account",
    });

    return NextResponse.json({ success: true, student_id: studentId }, { status: 201 });
  } catch (error) {
    logger.error("students.create_failed", { error });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
