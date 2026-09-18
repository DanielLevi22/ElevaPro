import { passwordValidationError, userFacingAuthError } from "@elevapro/shared";
import { NextResponse } from "next/server";
import {
  guardPublicRegistration,
  readPublicRegistrationJson,
} from "@/lib/public-registration-guard";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId } from "@/lib/trace";
import { memberRegistrationRequestSchema } from "@/modules/auth/services";

export async function POST(request: Request) {
  const guard = await guardPublicRegistration(request);
  if (guard.response) return guard.response;
  const { traceId } = guard;

  const parsed = await readPublicRegistrationJson(request, traceId);
  if (parsed.response) return parsed.response;

  const registration = memberRegistrationRequestSchema.safeParse(parsed.body);
  if (!registration.success) {
    return attachTraceId(
      NextResponse.json({ error: "Dados de cadastro inválidos." }, { status: 400 }),
      traceId,
    );
  }
  const { email, password, full_name } = registration.data;
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
