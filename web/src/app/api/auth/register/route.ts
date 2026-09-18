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

  const { email, password, full_name, service_types } = parsed.body as {
    email?: string;
    full_name?: string;
    password?: string;
    service_types?: string[];
  };

  if (!email || !password || !full_name || !service_types?.length) {
    return attachTraceId(
      NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 }),
      traceId,
    );
  }

  const passwordError = passwordValidationError(password);
  if (passwordError) {
    return attachTraceId(NextResponse.json({ error: passwordError }, { status: 400 }), traceId);
  }

  // Create auth user (auto-confirmed so immediate sign-in works)
  const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, account_type: "specialist", service_types },
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

  const userId = data.user.id;

  // O perfil já existe: o trigger `handle_new_user` o cria no INSERT em
  // auth.users, a partir do `user_metadata` acima. Esta rota tentava inserir de
  // novo, batia em chave duplicada, e o `if (!profileError)` abaixo pulava os
  // serviços — então todo especialista nascia sem nenhum, e o CASL negava
  // dietas com "Conta specialist com serviços [nenhum]".
  const serviceRows = (service_types as string[]).map((service_type) => ({
    specialist_id: userId,
    service_type,
  }));

  const { error: servicesError } = await supabaseAdmin
    .from("specialist_services" as never)
    .insert(serviceRows as never[]);

  // Falhar aqui deixa a conta pela metade: existe, entra, e não lê dieta nem
  // treino. Melhor recusar o cadastro do que entregar isso ao usuário.
  if (servicesError) {
    logger.error("registration.specialist_services_failed", { error: servicesError });
    await supabaseAdmin.auth.admin.deleteUser(userId);
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
    actorId: userId,
    subjectId: userId,
    resourceType: "account",
    traceId,
  });

  return attachTraceId(NextResponse.json({ success: true }), traceId);
}
