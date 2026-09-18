import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuditOutcome = "denied" | "failed" | "succeeded";
type AuditEventType =
  | "health.assessment.read"
  | "identity.registration.succeeded"
  | "security.rate_limit.denied";
type AuditResourceType = "account" | "physical_assessment_collection" | "rate_limit_policy";

export type SecurityAuditEvent = {
  eventType: AuditEventType;
  outcome: AuditOutcome;
  actorId?: string;
  subjectId?: string;
  resourceType: AuditResourceType;
  resourceId: string;
  traceId?: string;
};

/** Produz correlação investigável sem gravar o UUID da conta na trilha. */
export function pseudonymizeAuditSubject(subjectId: string): string {
  return createHash("sha256").update(subjectId).digest("hex");
}

// O gerador de tipos do Supabase não expressa argumento SQL nulo, e a RPC não
// tem default para ator/titular: o NULL precisa ir explícito. No banco ele
// significa "evento sem ator" (ex.: rate limit anônimo).
function optionalPrincipalHash(principalId: string | undefined): string {
  return (principalId ? pseudonymizeAuditSubject(principalId) : null) as string;
}

/**
 * Registra somente metadados permitidos na trilha append-only do banco.
 * A falha de observabilidade não muda o resultado da operação de negócio, mas
 * fica no logger técnico para abrir investigação.
 *
 * @example
 * await recordSecurityAuditEvent({
 *   eventType: "identity.registration.succeeded",
 *   outcome: "succeeded",
 *   resourceType: "account",
 *   resourceId: accountId,
 * });
 */
export async function recordSecurityAuditEvent(event: SecurityAuditEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc("record_security_audit_event", {
      p_event_type: event.eventType,
      p_outcome: event.outcome,
      p_actor_hash: optionalPrincipalHash(event.actorId),
      p_subject_hash: optionalPrincipalHash(event.subjectId),
      p_resource_type: event.resourceType,
      p_resource_id: event.resourceId,
      p_origin: "bff",
      p_trace_id: event.traceId,
    });

    if (error) {
      logger.error("security_audit.write_failed", {
        event_type: event.eventType,
        code: error.code,
      });
    }
  } catch (error) {
    logger.error("security_audit.write_failed", {
      event_type: event.eventType,
      error,
    });
  }
}
