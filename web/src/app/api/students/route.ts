import { type ServiceType, userFacingAuthError } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId, traceIdForRequest } from "@/lib/trace";

/**
 * O tipo de acompanhamento é escolha do especialista, mas só entre os
 * serviços que ele próprio presta — o cliente escolhe o quê, nunca se o
 * especialista está autorizado a prestar aquele serviço.
 */
async function findUnauthorizedServiceType(
  specialistId: string,
  serviceTypes: ServiceType[],
): Promise<ServiceType | undefined> {
  const { data: offeredServices, error } = await supabaseAdmin
    .from("specialist_services")
    .select("service_type")
    .eq("specialist_id", specialistId);
  if (error) throw error;

  const offered = new Set(
    (offeredServices ?? []).map((s: { service_type: ServiceType }) => s.service_type),
  );
  return serviceTypes.find((type) => !offered.has(type));
}

export async function POST(request: NextRequest) {
  const traceId = traceIdForRequest(request);
  try {
    const auth = await authorizeSpecialist(request);
    if (!auth.ok) return attachTraceId(auth.response, traceId);
    const caller = auth.caller;

    const body = await request.json();
    const { fullName, email } = body;
    const serviceTypes = body.serviceTypes as ServiceType[] | undefined;

    if (!fullName || !email || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return attachTraceId(
        NextResponse.json(
          { error: "fullName, email e serviceTypes são obrigatórios" },
          { status: 400 },
        ),
        traceId,
      );
    }

    const unauthorized = await findUnauthorizedServiceType(caller.id, serviceTypes);
    if (unauthorized) {
      return attachTraceId(
        NextResponse.json(
          { error: `Você não presta o serviço "${unauthorized}"` },
          { status: 422 },
        ),
        traceId,
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
      logger.warn("students.invite_rejected", {
        error: inviteError,
        status: inviteError.status ?? null,
        traceId,
      });
      const message =
        inviteError.message.includes("already registered") || inviteError.code === "email_exists"
          ? "Email já cadastrado"
          : userFacingAuthError(inviteError.message);
      return attachTraceId(NextResponse.json({ error: message }, { status: 422 }), traceId);
    }

    const studentId = invited.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles" as never).upsert(
      {
        id: studentId,
        email,
        full_name: fullName,
        account_type: "student",
        account_status: "invited",
      } as never,
      { onConflict: "id" },
    );

    if (profileError) {
      logger.error("students.profile_failed", { error: profileError, traceId });
      return attachTraceId(
        NextResponse.json({ error: "Erro ao cadastrar perfil do aluno" }, { status: 500 }),
        traceId,
      );
    }

    const links = serviceTypes.map((service_type: ServiceType) => ({
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
      logger.error("students.link_failed", { error: linkError, traceId });
      return attachTraceId(
        NextResponse.json({ error: "Erro ao vincular aluno ao especialista" }, { status: 500 }),
        traceId,
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
      traceId,
    });

    return attachTraceId(
      NextResponse.json({ success: true, student_id: studentId }, { status: 201 }),
      traceId,
    );
  } catch (error) {
    logger.error("students.create_failed", { error, traceId });
    return attachTraceId(
      NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 }),
      traceId,
    );
  }
}
