import { passwordValidationError, userFacingAuthError } from "@elevapro/shared";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  guardPublicRegistration,
  readPublicRegistrationJson,
} from "@/lib/public-registration-guard";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId } from "@/lib/trace";

export async function POST(request: Request) {
  const guard = await guardPublicRegistration(request);
  if (guard.response) return guard.response;
  const { traceId } = guard;

  const parsed = await readPublicRegistrationJson(request, traceId);
  if (parsed.response) return parsed.response;

  const { email, password, full_name } = parsed.body as {
    email?: string;
    full_name?: string;
    password?: string;
  };

  if (!email || !password || !full_name) {
    return attachTraceId(
      NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 }),
      traceId,
    );
  }
  const passwordError = passwordValidationError(password);
  if (passwordError) {
    return attachTraceId(NextResponse.json({ error: passwordError }, { status: 400 }), traceId);
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
    return attachTraceId(NextResponse.json({ error: msg }, { status: 400 }), traceId);
  }

  if (!data.user) {
    return attachTraceId(
      NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 }),
      traceId,
    );
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
