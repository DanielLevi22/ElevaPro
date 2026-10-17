import { PHYSICAL_ASSESSMENT_COLUMNS } from "@elevapro/shared";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSecurityAuditEvent, insertAssessment, authorizeLinkedSpecialist } = vi.hoisted(
  () => ({
    recordSecurityAuditEvent: vi.fn().mockResolvedValue(undefined),
    insertAssessment: vi.fn(),
    authorizeLinkedSpecialist: vi.fn(),
  }),
);
let assessmentRows: Array<{ id: string }>;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist,
  authorizeUser: async () => ({
    ok: true,
    caller: { id: "specialist-1", accountType: "specialist" },
  }),
}));
vi.mock("@/lib/supabase-titular", () => ({
  clienteDoTitular: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: assessmentRows, error: null }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: insertAssessment,
      select: () => ({
        eq: () => ({ order: async () => ({ data: assessmentRows, error: null }) }),
      }),
    }),
  },
}));

import { GET, POST } from "./route";

beforeEach(() => {
  authorizeLinkedSpecialist.mockResolvedValue({
    ok: true,
    caller: { id: "specialist-1", accountType: "specialist" },
  });
});

describe("POST /api/students/:id/assessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const columns = new Set(PHYSICAL_ASSESSMENT_COLUMNS.split(", "));
    insertAssessment.mockImplementation((record: Record<string, unknown>) => ({
      select: () => ({
        single: async () =>
          Object.keys(record).some((key) => !columns.has(key))
            ? { data: null, error: { code: "PGRST204", message: "Coluna inexistente" } }
            : { data: { id: "assessment-1", ...record }, error: null },
      }),
    }));
  });

  it("salva peso e altura nas colunas existentes em vez de retornar 500", async () => {
    const response = await POST(
      new NextRequest(request().url, {
        method: "POST",
        body: JSON.stringify({ weight_kg: 92, height_cm: 174, notes: "Observação fictícia" }),
      }),
      { params: Promise.resolve({ id: "student-1" }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      assessment: {
        student_id: "student-1",
        specialist_id: "specialist-1",
        weight_kg: 92,
        height_cm: 174,
      },
    });
  });

  it("preserva circunferências e dobras com lateralidade e nomes do banco", async () => {
    const measurements = {
      weight_kg: 92,
      height_cm: 174,
      circ_neck: 36,
      circ_right_forearm: 28,
      circ_left_forearm: 27,
      circ_right_calf: 39,
      circ_left_calf: 38,
      skinfold_abdomen: 18,
      skinfold_tricep: 12,
    };
    const response = await POST(
      new NextRequest(request().url, {
        method: "POST",
        body: JSON.stringify(measurements),
      }),
      { params: Promise.resolve({ id: "student-1" }) },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ assessment: measurements });
  });

  // LGPD, arts. 6º, VII e 46: a correção não pode permitir escrita de saúde
  // por uma conta recusada pelo controle de vínculo e papel.
  it("não grava dados de saúde quando a autorização recusa o especialista", async () => {
    authorizeLinkedSpecialist.mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    });
    const response = await POST(new NextRequest(request().url, { method: "POST", body: "{}" }), {
      params: Promise.resolve({ id: "student-1" }),
    });
    expect(response.status, "ACESSO INDEVIDO: conta recusada conseguiu gravar saúde").toBe(403);
    expect(
      insertAssessment,
      "DADO DE SAÚDE GRAVADO: autorização foi ignorada",
    ).not.toHaveBeenCalled();
  });
});

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
    expect(recordSecurityAuditEvent.mock.calls[0][0].traceId).toBe(
      response.headers.get("X-Request-Id"),
    );
  });

  it("não registra leitura quando a coleção está vazia", async () => {
    assessmentRows = [];

    await GET(request(), { params: Promise.resolve({ id: "student-1" }) });

    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
