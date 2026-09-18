import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSecurityAuditEvent } = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
let assessmentRows: Array<{ id: string }>;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: "specialist-1", accountType: "specialist" },
  }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: assessmentRows, error: null }) }),
      }),
    }),
  },
}));

import { GET } from "./route";

function request(): NextRequest {
  return new NextRequest("https://elevapro.test/api/students/student-1/assessments");
}

describe("GET /api/students/:id/assessments", () => {
  beforeEach(() => {
    assessmentRows = [{ id: "assessment-1" }];
    vi.clearAllMocks();
  });

  // A leitura por terceiro é tratamento de dado de saúde e precisa deixar
  // evidência mínima, sem copiar medidas. LGPD, arts. 6º, X e 46.
  it("registra a leitura autorizada sem incluir valores de saúde", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "student-1" }) });

    expect(response.status).toBe(200);
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "health.assessment.read",
        actorId: "specialist-1",
        subjectId: "student-1",
        resourceType: "physical_assessment_collection",
      }),
    );
    // O ID do aluno só pode chegar como titular, que o banco pseudonimiza.
    expect(recordSecurityAuditEvent.mock.calls[0][0]).not.toHaveProperty("resourceId");
  });

  it("não registra leitura quando a coleção está vazia", async () => {
    assessmentRows = [];

    await GET(request(), { params: Promise.resolve({ id: "student-1" }) });

    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
