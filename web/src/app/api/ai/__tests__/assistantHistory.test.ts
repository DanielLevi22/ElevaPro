import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
// O transporte (rate limit/env) está fora do seam; autenticação, vínculo e serviços são reais.
vi.mock("@/lib/ai-route", () => ({ withAiRoute: (route: unknown) => route }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getClaims: async (token: string) => ({
        data: { claims: { sub: token, aal: "aal2" } },
        error: null,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: ((row: Row) => boolean)[] = [];
      let insertion: Row | undefined;
      let patch: Row | undefined;
      const selected = () =>
        (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return query;
        },
        is: (column: string, value: unknown) => {
          filters.push((row) => (row[column] ?? null) === value);
          return query;
        },
        order: () => query,
        limit: () => query,
        insert: (row: Row) => {
          insertion = { id: "new-chat", ...row };
          return query;
        },
        update: (row: Row) => {
          patch = row;
          return query;
        },
        single: async () => ({ data: insertion ?? selected()[0], error: null }),
        maybeSingle: async () => ({ data: selected()[0] ?? null, error: null }),
        // biome-ignore lint/suspicious/noThenProperty: fronteira PostgREST
        then: (resolve: (value: unknown) => unknown) => {
          if (patch) for (const row of selected()) Object.assign(row, patch);
          return resolve({ data: selected(), error: null });
        },
      };
      return query;
    },
  },
}));
const { GET, POST, PATCH } = await import("../chat/[studentId]/sessions/route");
const context = { params: Promise.resolve({ studentId: "student" }) };
function request(method = "GET", token: string | null = "author", body?: unknown) {
  return new NextRequest("https://example.test/api/ai/chat/student/sessions?module=all", {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  tables = {
    profiles: [
      { id: "author", account_type: "specialist" },
      { id: "stranger", account_type: "specialist" },
      { id: "student", account_type: "student" },
    ],
    student_specialists: [
      { id: "link", student_id: "student", specialist_id: "author", status: "active" },
    ],
    student_consents: [
      {
        student_id: "student",
        consent_type: "health_data_collection",
        given_at: "2026-09-01",
        revoked_at: null,
      },
    ],
    ai_chat_sessions: [
      {
        id: "workout",
        student_id: "student",
        specialist_id: "author",
        module: "workout",
        title: "Treino A",
        archived: false,
      },
      {
        id: "nutrition",
        student_id: "student",
        specialist_id: "author",
        module: "nutrition",
        title: "Dieta A",
        archived: false,
      },
      {
        id: "foreign",
        student_id: "student",
        specialist_id: "stranger",
        module: "nutrition",
        title: "Privado",
        archived: false,
      },
    ],
  };
});

it("lista os dois módulos, renomeia e arquiva sem apagar a outra conversa", async () => {
  const listed = await (await GET(request(), context)).json();
  expect(listed.sessions.map((session: Row) => session.id)).toEqual(["workout", "nutrition"]);
  expect(
    (
      await PATCH(
        request("PATCH", "author", { sessionId: "nutrition", title: "Novo título" }),
        context,
      )
    ).status,
  ).toBe(200);
  expect((await (await GET(request(), context)).json()).sessions[1].title).toBe("Novo título");
  expect(
    (await PATCH(request("PATCH", "author", { sessionId: "nutrition" }), context)).status,
  ).toBe(200);
  expect(
    (await (await GET(request(), context)).json()).sessions.map((session: Row) => session.id),
  ).toEqual(["workout"]);
});

// Art. 6°, VII e Art. 11: títulos também podem conter informação de saúde.
it.each([
  "no-token",
  "student",
  "unlinked",
  "revoked",
  "missing-consent",
])("recusa leitura, criação e alteração sem autorização: %s", async (reason) => {
  const token = reason === "no-token" ? null : reason === "student" ? "student" : "author";
  if (reason === "unlinked") tables.student_specialists = [];
  if (reason === "revoked") tables.student_consents[0].revoked_at = "2026-09-02";
  if (reason === "missing-consent") tables.student_consents = [];
  for (const response of [
    await GET(request("GET", token), context),
    await POST(request("POST", token, { module: "nutrition" }), context),
    await PATCH(request("PATCH", token, { sessionId: "nutrition", title: "Tentativa" }), context),
  ]) {
    expect(
      response.status,
      "HISTÓRICO EXPOSTO: acesso sem vínculo/consentimento",
    ).toBeGreaterThanOrEqual(400);
    if (reason === "revoked" || reason === "missing-consent") {
      expect(await response.json()).toMatchObject({ code: "consent_required" });
    }
  }
});

it("não permite alterar conversa de outro especialista", async () => {
  expect(
    (await PATCH(request("PATCH", "author", { sessionId: "foreign", title: "Tentativa" }), context))
      .status,
  ).toBe(404);
});
