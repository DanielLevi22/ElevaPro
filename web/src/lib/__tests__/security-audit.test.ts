import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError, rpc } = vi.hoisted(() => ({ loggerError: vi.fn(), rpc: vi.fn() }));

vi.mock("../supabase-admin", () => ({ supabaseAdmin: { rpc } }));
vi.mock("../logger", () => ({ logger: { error: loggerError } }));

import { pseudonymizeAuditSubject, recordSecurityAuditEvent } from "../security-audit";

beforeEach(() => {
  loggerError.mockReset();
  rpc.mockReset();
});

describe("security audit", () => {
  it("envia somente o contrato mínimo para a RPC append-only", async () => {
    rpc.mockResolvedValue({ error: null });

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
      p_actor_hash: null,
      p_subject_hash: null,
      p_resource_type: "rate_limit_policy",
      p_resource_id: "ai",
      p_origin: "bff",
      p_trace_id: "a".repeat(32),
    });
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

it("pseudonimiza UUIDs sem devolvê-los à trilha", () => {
  const accountId = "2c099744-62e6-4fd4-beb9-a88c4274f73c";
  const hash = pseudonymizeAuditSubject(accountId);

  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  expect(hash).not.toContain(accountId);
});
