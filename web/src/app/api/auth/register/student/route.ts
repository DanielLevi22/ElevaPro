import { passwordValidationError, userFacingAuthError } from "@elevapro/shared";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceRequestBodyLimit, requestBodyLimits } from "@/lib/request-body-limit";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId, traceIdForRequest } from "@/lib/trace";

export async function POST(request: Request) {
  const traceId = traceIdForRequest(request);
  const limited = await enforceRateLimit(request, "registration", traceId);
  if (limited) return attachTraceId(limited, traceId);

  const oversized = await enforceRequestBodyLimit(request, requestBodyLimits.publicRegistration);
  if (oversized) return attachTraceId(oversized, traceId);

  const { email, password, full_name } = await request.json();

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }
  const passwordError = passwordValidationError(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, account_type: "member" },
  });

  if (authError) {
    const msg =
      authError.message.toLowerCase().includes("already registered") ||
      authError.code === "email_exists"
        ? "Este e-mail já possui uma conta."
        : userFacingAuthError(authError.message);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin.from("profiles" as never).insert({
    id: data.user.id,
    email,
    full_name,
    account_type: "member",
    account_status: "active",
  } as never);

  if (profileError) {
    logger.error("registration.student_profile_failed", { error: profileError, trace_id: traceId });
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return attachTraceId(
      NextResponse.json(
        { error: "Não foi possível concluir o cadastro. Tente novamente." },
        { status: 500 },
      ),
      traceId,
    );
  }

  await recordSecurityAuditEvent({
    eventType: "identity.registration.succeeded",
    outcome: "succeeded",
    actorId: data.user.id,
    subjectId: data.user.id,
    resourceType: "account",
    traceId,
  });

  return attachTraceId(NextResponse.json({ success: true }), traceId);
}
