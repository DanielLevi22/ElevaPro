import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSecurityAuditEvent } = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeUser: async () => ({
    ok: true,
    caller: { id: "aluno-9", accountType: "student" },
  }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent }));

import { POST } from "./route";

function request(): NextRequest {
  return new NextRequest("https://elevapro.test/api/auth/accept-invite", { method: "POST" });
}

describe("POST /api/auth/accept-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // O evento basta para investigar sem virar um segundo acervo de dado
  // pessoal: nenhum e-mail, nome ou token do titular entra nele.
  it("registra o convite aceito sem e-mail, nome ou token no evento", async () => {
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "identity.invite.accepted",
        outcome: "succeeded",
        actorId: "aluno-9",
        subjectId: "aluno-9",
        resourceType: "account",
      }),
    );
    const [event] = recordSecurityAuditEvent.mock.calls[0];
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("token");
  });
});
