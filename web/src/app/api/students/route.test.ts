import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordSecurityAuditEvent } = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const { inviteUserByEmail } = vi.hoisted(() => ({
  inviteUserByEmail: vi.fn(),
}));

let specialistServiceRows: Array<{ service_type: string }>;
let specialistServiceError: { message: string } | null;
let studentProfileError: { code: string; message: string } | null;
let studentSpecialistInserts: Array<Record<string, unknown>>;
let studentSpecialistError: { code: string; message: string } | null;

vi.mock("@/lib/api-auth", () => ({
  authorizeSpecialist: async () => ({
    ok: true,
    caller: { id: "specialist-1", accountType: "specialist" },
  }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    auth: { admin: { inviteUserByEmail } },
    from: (table: string) => {
      if (table === "profiles") {
        return { upsert: async () => ({ error: studentProfileError }) };
      }
      if (table === "specialist_services") {
        return {
          select: () => ({
            eq: async () => ({ data: specialistServiceRows, error: specialistServiceError }),
          }),
        };
      }
      if (table === "student_specialists") {
        return {
          upsert: async (rows: Array<Record<string, unknown>>) => {
            studentSpecialistInserts.push(...rows);
            return { error: studentSpecialistError };
          },
        };
      }
      throw new Error(`tabela não esperada no teste: ${table}`);
    },
  },
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new NextRequest("https://elevapro.test/api/students", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/students", () => {
  beforeEach(() => {
    specialistServiceRows = [{ service_type: "personal_training" }];
    specialistServiceError = null;
    studentProfileError = null;
    studentSpecialistInserts = [];
    studentSpecialistError = null;
    vi.clearAllMocks();
    inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "aluno-9" } },
      error: null,
    });
  });

  // ADR-0035: a senha é prova de autenticação do titular de uma conta que
  // guarda dado de saúde, não algo que o Specialist define para outra pessoa.
  it("convida o aluno por e-mail em vez de criar conta com senha definida pelo especialista", async () => {
    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(res.status).toBe(201);
    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "marina@exemplo.com",
      expect.objectContaining({
        data: expect.objectContaining({ full_name: "Marina Alves", account_type: "student" }),
      }),
    );
  });

  // Um cliente desatualizado (ou hostil) que ainda mande senha no corpo não
  // pode fazer essa senha chegar a lugar nenhum — nem no evento, nem no
  // usuário criado. `inviteUserByEmail` não aceita senha.
  it("ignora senha enviada no corpo, mesmo que o cliente mande", async () => {
    await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        password: "uma-senha-que-nao-deveria-existir",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(inviteUserByEmail.mock.calls[0][1]).not.toHaveProperty("password");
  });

  // Art. 6°, III (necessidade): a UI pode esconder a opção, mas a regra de
  // negócio não pode depender do cliente se comportar bem — só a validação
  // no serviço impede um vínculo de serviço que o especialista não presta.
  it("rejeita tipo de acompanhamento que o especialista não presta, sem criar nada", async () => {
    specialistServiceRows = [{ service_type: "personal_training" }];

    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["nutrition_consulting"],
      }),
    );

    expect(res.status).toBe(422);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    const json = await res.json();
    expect(json.error).toContain("nutrition_consulting");
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(studentSpecialistInserts).toEqual([]);
  });

  it("não confunde falha na consulta de serviços com serviço não oferecido", async () => {
    specialistServiceError = { message: "database unavailable" };

    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("inclui o identificador da requisição quando o convite é recusado", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    inviteUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", code: "email_exists" },
    });

    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(res.status).toBe(422);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    expect((await res.json()).error).toBe("Email já cadastrado");
    expect(JSON.parse(String(warning.mock.calls[0]?.[0]))).toMatchObject({
      event: "students.invite_rejected",
      error: { code: "email_exists" },
      traceId: res.headers.get("X-Request-Id"),
    });
    warning.mockRestore();
  });

  it("correlaciona a falha de vínculo com o identificador da resposta", async () => {
    studentSpecialistError = { code: "23503", message: "foreign key violation" };
    const loggedError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(String(loggedError.mock.calls[0]?.[0]))).toMatchObject({
      event: "students.link_failed",
      traceId: res.headers.get("X-Request-Id"),
      error: { code: "23503" },
    });
    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
    loggedError.mockRestore();
  });

  it("não confirma cadastro quando a gravação do perfil falha", async () => {
    studentProfileError = { code: "23505", message: "duplicate profile" };
    const loggedError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(String(loggedError.mock.calls[0]?.[0]))).toMatchObject({
      event: "students.profile_failed",
      traceId: res.headers.get("X-Request-Id"),
      error: { code: "23505" },
    });
    expect(studentSpecialistInserts).toEqual([]);
    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
    loggedError.mockRestore();
  });

  // Tipo válido cria o vínculo em student_specialists — a criação de conta e
  // o vínculo de serviço são o mesmo request, não dois passos separados.
  it("cria um vínculo em student_specialists por tipo de acompanhamento escolhido", async () => {
    specialistServiceRows = [
      { service_type: "personal_training" },
      { service_type: "nutrition_consulting" },
    ];

    await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training", "nutrition_consulting"],
      }),
    );

    expect(studentSpecialistInserts).toEqual([
      {
        student_id: "aluno-9",
        specialist_id: "specialist-1",
        service_type: "personal_training",
        status: "active",
      },
      {
        student_id: "aluno-9",
        specialist_id: "specialist-1",
        service_type: "nutrition_consulting",
        status: "active",
      },
    ]);
  });

  // O evento precisa bastar para investigar sem virar um segundo acervo de
  // dado pessoal — nome e e-mail do aluno não pertencem à trilha de auditoria.
  it("registra o convite sem e-mail nem nome do aluno no evento", async () => {
    const response = await POST(
      request({
        fullName: "Marina Alves",
        email: "marina@exemplo.com",
        serviceTypes: ["personal_training"],
      }),
    );

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "identity.invite.sent",
        outcome: "succeeded",
        actorId: "specialist-1",
        subjectId: "aluno-9",
        resourceType: "account",
      }),
    );
    const [event] = recordSecurityAuditEvent.mock.calls[0];
    expect(event.traceId).toBe(response.headers.get("X-Request-Id"));
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("fullName");
    expect(event).not.toHaveProperty("full_name");
  });
});
