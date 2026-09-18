import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError, rpc } = vi.hoisted(() => ({ loggerError: vi.fn(), rpc: vi.fn() }));

vi.mock("../supabase-admin", () => ({ supabaseAdmin: { rpc } }));
vi.mock("../logger", () => ({ logger: { error: loggerError } }));

import { recordSecurityAuditEvent } from "../security-audit";

beforeEach(() => {
  loggerError.mockReset();
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe("security audit", () => {
  it("envia somente o contrato mínimo para a RPC append-only", async () => {
    await recordSecurityAuditEvent({
      eventType: "security.rate_limit.denied",
      outcome: "denied",
      resourceType: "rate_limit_policy",
      resourceId: "ai",
      traceId: "a".repeat(32),
    });

    expect(rpc).toHaveBeenCalledWith("record_security_audit_event", {
      p_event_type: "security.rate_limit.denied",
      p_outcome: "denied",
      p_actor_id: undefined,
      p_subject_id: undefined,
      p_resource_type: "rate_limit_policy",
      p_resource_id: "ai",
      p_origin: "bff",
      p_trace_id: "a".repeat(32),
    });
  });

  // O resource_id é gravado como veio; o titular é pseudonimizado pelo banco.
  // UUID no resource_id desfaria o pseudônimo da mesma linha. LGPD, arts. 12 e 13, § 4º.
  it("não envia o UUID do titular como identificador do recurso", async () => {
    const accountId = "2c099744-62e6-4fd4-beb9-a88c4274f73c";

    await recordSecurityAuditEvent({
      eventType: "identity.registration.succeeded",
      outcome: "succeeded",
      actorId: accountId,
      subjectId: accountId,
      resourceType: "account",
    });

    const [, args] = rpc.mock.calls[0];
    expect(args.p_subject_id, "PSEUDÔNIMO PERDIDO: titular não chegou à RPC").toBe(accountId);
    expect(args.p_resource_id, "UUID EM CLARO: titular virou resource_id").toBeUndefined();
  });

  it("não transforma uma indisponibilidade de auditoria em falha da operação", async () => {
    rpc.mockRejectedValue(new Error("database unavailable"));

    await expect(
      recordSecurityAuditEvent({
        eventType: "security.rate_limit.denied",
        outcome: "denied",
        resourceType: "rate_limit_policy",
        resourceId: "ai",
      }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith("security_audit.write_failed", {
      event_type: "security.rate_limit.denied",
      error: expect.any(Error),
    });
  });
});
