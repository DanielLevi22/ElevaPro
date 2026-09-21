import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSecurityAuditEvent } = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
const { inviteUserByEmail } = vi.hoisted(() => ({ inviteUserByEmail: vi.fn() }));

let profileRow: { email: string; full_name: string | null; account_status: string } | null;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: "specialist-1", accountType: "specialist" },
  }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    auth: { admin: { inviteUserByEmail } },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) }),
      }),
    }),
  },
}));

import { POST } from "./route";

function request(): NextRequest {
  return new NextRequest("https://elevapro.test/api/students/student-1/resend-invite", {
    method: "POST",
  });
}

const params = { params: Promise.resolve({ id: "student-1" }) };

describe("POST /api/students/:id/resend-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileRow = {
      email: "marina@exemplo.com",
      full_name: "Marina Alves",
      account_status: "invited",
    };
    inviteUserByEmail.mockResolvedValue({ data: { user: { id: "student-1" } }, error: null });
  });

  it("reenvia o convite quando o aluno ainda está pendente", async () => {
    const res = await POST(request(), params);

    expect(res.status).toBe(200);
    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "marina@exemplo.com",
      expect.objectContaining({ data: expect.objectContaining({ full_name: "Marina Alves" }) }),
    );
  });

  // Reenviar convite pra quem já entrou não faz sentido — e chamar
  // inviteUserByEmail de novo criaria confusão com um convite já aceito.
  it("recusa reenviar para aluno que já aceitou o convite", async () => {
    profileRow = {
      email: "marina@exemplo.com",
      full_name: "Marina Alves",
      account_status: "active",
    };

    const res = await POST(request(), params);

    expect(res.status).toBe(422);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("registra o reenvio sem e-mail nem nome no evento", async () => {
    await POST(request(), params);

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "identity.invite.resent",
        outcome: "succeeded",
        actorId: "specialist-1",
        subjectId: "student-1",
        resourceType: "account",
      }),
    );
    const [event] = recordSecurityAuditEvent.mock.calls[0];
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("full_name");
  });
});
