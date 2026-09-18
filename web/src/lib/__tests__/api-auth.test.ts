import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A tabela de decisão do helper de autorização do BFF.
 *
 * Estes testes existem porque a versão anterior desta lógica estava copiada em
 * doze arquivos, e duas cópias com o mesmo nome davam garantias diferentes: em
 * `api/students/**` checavam tipo de conta e vínculo, em `api/ai/chat/**`
 * devolviam qualquer usuário autenticado. Aqui a garantia de cada função é
 * afirmada uma vez, e o `403` de "sem vínculo" é o caso que não pode regredir.
 */

const authGetClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims: authGetClaims } }),
}));

// Encadeamento do PostgREST: cada filtro devolve o builder, `maybeSingle` resolve.
let profileRow: { account_type: string } | null = null;
let linkRow: { id: string } | null = null;

const builder: Record<string, unknown> = {};
const chain = () => builder;
builder.select = vi.fn(chain);
builder.eq = vi.fn(chain);
builder.limit = vi.fn(chain);

const mockFrom = vi.fn((table: string) => {
  builder.maybeSingle = vi.fn(async () => ({
    data: table === "profiles" ? profileRow : linkRow,
    error: null,
  }));
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}));

const {
  authorizeLinkedSpecialist,
  authorizeMfaSpecialist,
  authorizeSpecialist,
  authorizeStudent,
  authorizeUser,
} = await import("../api-auth");

/** Uma requisição com o header que o helper lê — nada mais é usado. */
function requestWith(authorization?: string): NextRequest {
  return {
    headers: { get: (name: string) => (name === "authorization" ? (authorization ?? null) : null) },
  } as unknown as NextRequest;
}

const VALID = "Bearer token-valido";

beforeEach(() => {
  vi.clearAllMocks();
  authGetClaims.mockResolvedValue({
    data: { claims: { sub: "user-1", aal: "aal1" } },
    error: null,
  });
  profileRow = { account_type: "specialist" };
  linkRow = { id: "link-1" };
});

describe("authorizeUser", () => {
  it("recusa sem header", async () => {
    const auth = await authorizeUser(requestWith());
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it("recusa header sem token depois do Bearer", async () => {
    const auth = await authorizeUser(requestWith("Bearer   "));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it("aceita o esquema em qualquer caixa", async () => {
    const auth = await authorizeUser(requestWith("bearer token-valido"));
    expect(auth.ok).toBe(true);
  });

  it("recusa token que o Supabase não reconhece", async () => {
    authGetClaims.mockResolvedValue({ data: { claims: null }, error: new Error("invalid") });
    const auth = await authorizeUser(requestWith(VALID));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it("recusa com 403 quando não há perfil", async () => {
    profileRow = null;
    const auth = await authorizeUser(requestWith(VALID));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });

  // O furo original: `account_type` saía de `user_metadata`, que o próprio
  // usuário reescreve com `updateUser`.
  it("lê o account_type de profiles, não do token", async () => {
    profileRow = { account_type: "member" };

    const auth = await authorizeUser(requestWith(VALID));

    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.caller.accountType).toBe("member");
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });
});

describe("authorizeSpecialist", () => {
  it("aceita especialista", async () => {
    const auth = await authorizeSpecialist(requestWith(VALID));
    expect(auth.ok).toBe(true);
  });

  it("recusa aluno com 403", async () => {
    profileRow = { account_type: "student" };
    const auth = await authorizeSpecialist(requestWith(VALID));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });
});

describe("authorizeMfaSpecialist", () => {
  // Art. 46: senha válida não basta para uma conta que acessa dados de alunos.
  it("recusa especialista em aal1", async () => {
    const auth = await authorizeMfaSpecialist(requestWith(VALID));

    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(await auth.response.json()).toEqual({ error: "mfa_required" });
  });

  it("aceita especialista em aal2", async () => {
    authGetClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", aal: "aal2" } },
      error: null,
    });

    const auth = await authorizeMfaSpecialist(requestWith(VALID));

    expect(auth.ok).toBe(true);
  });
});

describe("authorizeLinkedSpecialist", () => {
  it("aceita especialista com vínculo ativo", async () => {
    const auth = await authorizeLinkedSpecialist(requestWith(VALID), "aluno-1");
    expect(auth.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("student_specialists");
  });

  // O achado de 2026-08-11: `studentId` vinha da URL e ninguém checava vínculo,
  // então qualquer conta lia a anamnese de qualquer aluno pela rota de IA.
  it("recusa especialista sem vínculo com 403", async () => {
    linkRow = null;
    const auth = await authorizeLinkedSpecialist(requestWith(VALID), "aluno-de-outro");
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });

  it("recusa aluno antes mesmo de consultar o vínculo", async () => {
    profileRow = { account_type: "student" };
    const auth = await authorizeLinkedSpecialist(requestWith(VALID), "aluno-1");
    expect(auth.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalledWith("student_specialists");
  });

  it("filtra o vínculo por especialista, aluno e status ativo", async () => {
    await authorizeLinkedSpecialist(requestWith(VALID), "aluno-1");

    const filtros = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(filtros).toContainEqual(["specialist_id", "user-1"]);
    expect(filtros).toContainEqual(["student_id", "aluno-1"]);
    expect(filtros).toContainEqual(["status", "active"]);
  });
});

describe("authorizeStudent", () => {
  it.each(["student", "member"])("aceita conta do tipo %s", async (accountType) => {
    profileRow = { account_type: accountType };
    const auth = await authorizeStudent(requestWith(VALID));
    expect(auth.ok).toBe(true);
  });

  it("recusa especialista com 403", async () => {
    const auth = await authorizeStudent(requestWith(VALID));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });

  it("devolve o id do token, nunca de parâmetro", async () => {
    profileRow = { account_type: "student" };
    const auth = await authorizeStudent(requestWith(VALID));
    if (auth.ok) expect(auth.caller.id).toBe("user-1");
  });
});
