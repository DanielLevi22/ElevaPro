import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./backup/route";
import { GET } from "./route";

const { authorize } = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeAdmin: authorize }));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

// Art. 6º, VII: gerenciamento de arquivos não pode herdar acesso de especialista ou aluno.
it("uma conta sem privilégio não acessa o catálogo administrativo nem publica backup", async () => {
  authorize.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
  });
  expect((await GET(new NextRequest("https://app.test/api/admin/meal-media"))).status).toBe(403);
  const denied = await POST(
    new NextRequest("https://app.test/api/admin/meal-media/backup", {
      method: "POST",
      body: "JSON inválido",
    }),
  );
  expect(denied.status, "ARQUIVOS EXPOSTOS: conta recusada alcançou importação").toBe(403);
});

it("admin consulta imagens e destinos sem receber chave privada", async () => {
  authorize.mockResolvedValue({
    ok: true,
    caller: { id: "admin", accountType: "admin", hasPrivilegedProof: true },
  });
  vi.stubEnv("IMAGEKIT_PRIVATE_KEY", "secret-never-public");
  const response = await GET(new NextRequest("https://app.test/api/admin/meal-media"));
  const body = await response.text();
  expect(response.status).toBe(200);
  expect(JSON.parse(body).catalog.images).toHaveLength(16);
  expect(body, "SEGREDO EXPOSTO: resposta contém credencial").not.toContain("secret-never-public");
  vi.unstubAllEnvs();
});
