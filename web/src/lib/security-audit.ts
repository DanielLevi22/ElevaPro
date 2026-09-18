import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuditOutcome = "denied" | "failed" | "succeeded";
type AuditEventType = "identity.registration.succeeded" | "security.rate_limit.denied";
type AuditResourceType = "account" | "rate_limit_policy";

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
    const { error } = await supabaseAdmin.rpc(
      "record_security_audit_event" as never,
      {
        p_event_type: event.eventType,
        p_outcome: event.outcome,
        p_actor_hash: event.actorId ? pseudonymizeAuditSubject(event.actorId) : null,
        p_subject_hash: event.subjectId ? pseudonymizeAuditSubject(event.subjectId) : null,
        p_resource_type: event.resourceType,
        p_resource_id: event.resourceId,
        p_origin: "bff",
        p_trace_id: event.traceId ?? null,
      } as never,
    );

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
