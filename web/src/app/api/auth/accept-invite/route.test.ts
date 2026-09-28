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

  // Uma chamada autenticada não prova troca de senha; só o trigger do Auth pode
  // registrar a evidência. LGPD, art. 6º, X.
  it("não permite forjar aceite de convite com chamada direta", async () => {
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
