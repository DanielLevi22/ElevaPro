import { userFacingAuthError } from "@elevapro/shared";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type {
  MemberRegistrationRequest,
  SpecialistRegistrationRequest,
} from "./registration-request.schema";

export type RegistrationResult = { ok: true } | { ok: false; error: string; status: 400 | 500 };

type CreatedUser = { id: string };

async function createUser(
  registration: MemberRegistrationRequest | SpecialistRegistrationRequest,
  accountType: "member" | "specialist",
): Promise<CreatedUser | RegistrationResult> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: registration.email,
    password: registration.password,
    email_confirm: true,
    user_metadata: {
      full_name: registration.full_name,
      account_type: accountType,
      ...("service_types" in registration ? { service_types: registration.service_types } : {}),
    },
  });
  if (error) return { ok: false, error: userFacingAuthError(error.message), status: 400 };
  if (!data.user) return { ok: false, error: "Erro ao criar usuário.", status: 500 };
  return { id: data.user.id };
}

function failed(result: CreatedUser | RegistrationResult): result is RegistrationResult {
  return "ok" in result;
}

async function auditRegistration(userId: string, traceId: string): Promise<void> {
  await recordSecurityAuditEvent({
    eventType: "identity.registration.succeeded",
    outcome: "succeeded",
    actorId: userId,
    subjectId: userId,
    resourceType: "account",
    traceId,
  });
}

/** Provisiona conta member; o trigger do banco é o único criador de profiles. */
export async function provisionMemberRegistration(
  registration: MemberRegistrationRequest,
  traceId: string,
): Promise<RegistrationResult> {
  const user = await createUser(registration, "member");
  if (failed(user)) return user;
  await auditRegistration(user.id, traceId);
  return { ok: true };
}

/** Provisiona especialista e seus serviços, desfazendo a conta se a operação ficar parcial. */
export async function provisionSpecialistRegistration(
  registration: SpecialistRegistrationRequest,
  traceId: string,
): Promise<RegistrationResult> {
  const user = await createUser(registration, "specialist");
  if (failed(user)) return user;
  const rows = registration.service_types.map((service_type) => ({
    specialist_id: user.id,
    service_type,
  }));
  const { error } = await supabaseAdmin
    .from("specialist_services" as never)
    .insert(rows as never[]);
  if (!error) {
    await auditRegistration(user.id, traceId);
    return { ok: true };
  }
  logger.error("registration.specialist_services_failed", { error });
  await supabaseAdmin.auth.admin.deleteUser(user.id);
  return {
    ok: false,
    error: "Não foi possível concluir o cadastro. Tente novamente.",
    status: 500,
  };
}
