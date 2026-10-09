import type { Database } from "@elevapro/shared";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./backup/route";
import { GET } from "./route";

const { authorize, databaseFetch } = vi.hoisted(() => ({
  authorize: vi.fn(),
  databaseFetch: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ authorizeAdmin: authorize }));
vi.mock("@/lib/supabase-titular", () => ({
  clienteDoTitular: () =>
    createClient<Database>("https://database.example.test", "public-key", {
      global: { fetch: databaseFetch },
    }),
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  databaseFetch.mockReset();
});

// Art. 6º, VII: gerenciamento de arquivos não pode herdar acesso de especialista ou aluno.
it("uma conta sem privilégio não acessa o catálogo administrativo nem publica backup", async () => {
  authorize.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
  });
  expect(
    (await GET(new NextRequest("https://app.test/api/admin/meal-media"))).status,
    "RASCUNHOS EXPOSTOS: conta recusada acessou o catálogo administrativo",
  ).toBe(403);
  const denied = await POST(
    new NextRequest("https://app.test/api/admin/meal-media/backup", {
      method: "POST",
      body: "JSON inválido",
    }),
  );
  expect(denied.status, "ARQUIVOS EXPOSTOS: conta recusada alcançou importação").toBe(403);
  expect(
    databaseFetch,
    "RASCUNHOS EXPOSTOS: conta recusada alcançou o banco",
  ).not.toHaveBeenCalled();
});

it("admin consulta imagens e destinos sem receber chave privada", async () => {
  authorize.mockResolvedValue({
    ok: true,
    caller: { id: "admin", accountType: "admin", hasPrivilegedProof: true },
  });
  vi.stubEnv("IMAGEKIT_PRIVATE_KEY", "secret-never-public");
  databaseFetch.mockResolvedValue(new Response("[]", { headers: { "content-range": "*/2153" } }));
  const response = await GET(new NextRequest("https://app.test/api/admin/meal-media"));
  const body = await response.text();
  expect(response.status).toBe(200);
  expect(JSON.parse(body).totalImages).toBe(2153);
  expect(body, "SEGREDO EXPOSTO: resposta contém credencial").not.toContain("secret-never-public");
  vi.unstubAllEnvs();
});

it("recusa página inválida antes de consultar o banco", async () => {
  authorize.mockResolvedValue({
    ok: true,
    caller: { id: "admin", accountType: "admin", hasPrivilegedProof: true },
  });
  const response = await GET(new NextRequest("https://app.test/api/admin/meal-media?page=-1"));
  expect(response.status).toBe(400);
  expect(databaseFetch).not.toHaveBeenCalled();
});
