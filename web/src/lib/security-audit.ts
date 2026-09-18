import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuditOutcome = "denied" | "failed" | "succeeded";
type AuditEventType =
  | "health.assessment.read"
  | "identity.registration.succeeded"
  | "security.rate_limit.denied";

// Recurso que é o próprio titular (a conta, a coleção de avaliações dele): o
// banco grava o pseudônimo do titular como resource_id. Não há campo para o ID,
// porque um UUID em claro ao lado do pseudônimo desfaria o pseudônimo.
type SubjectResource = {
  resourceType: "account" | "physical_assessment_collection";
  subjectId: string;
};

// Recurso que não identifica pessoa, como o nome de uma política.
type NamedResource = {
  resourceType: "rate_limit_policy";
  resourceId: string;
};

export type SecurityAuditEvent = {
  eventType: AuditEventType;
  outcome: AuditOutcome;
  actorId?: string;
  traceId?: string;
} & (SubjectResource | NamedResource);

/**
 * Registra somente metadados permitidos na trilha append-only do banco. Os
 * UUIDs seguem para a RPC, que aplica o HMAC com a chave do Vault: a chave
 * nunca sai do banco e só o pseudônimo é gravado.
 * A falha de observabilidade não muda o resultado da operação de negócio, mas
 * fica no logger técnico para abrir investigação.
 *
 * @example
 * await recordSecurityAuditEvent({
 *   eventType: "identity.registration.succeeded",
 *   outcome: "succeeded",
 *   actorId: accountId,
 *   subjectId: accountId,
 *   resourceType: "account",
 * });
 */
export async function recordSecurityAuditEvent(event: SecurityAuditEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc("record_security_audit_event", {
      p_event_type: event.eventType,
      p_outcome: event.outcome,
      p_actor_id: event.actorId,
      p_subject_id: "subjectId" in event ? event.subjectId : undefined,
      p_resource_type: event.resourceType,
      p_resource_id: "resourceId" in event ? event.resourceId : undefined,
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
