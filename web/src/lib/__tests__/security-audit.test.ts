import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError, rpc } = vi.hoisted(() => ({ loggerError: vi.fn(), rpc: vi.fn() }));

vi.mock("../supabase-admin", () => ({ supabaseAdmin: { rpc } }));
vi.mock("../logger", () => ({ logger: { error: loggerError } }));

import { recordSecurityAuditEvent } from "../security-audit";

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
    });

    expect(rpc).toHaveBeenCalledWith("record_security_audit_event", {
      p_event_type: "security.rate_limit.denied",
      p_outcome: "denied",
      p_actor_id: null,
      p_subject_id: null,
      p_resource_type: "rate_limit_policy",
      p_resource_id: "ai",
      p_origin: "bff",
      p_trace_id: null,
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
