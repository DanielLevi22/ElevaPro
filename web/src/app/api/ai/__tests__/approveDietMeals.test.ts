import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let authorized: boolean;
let writeFailure: boolean;
const rpc = vi.fn();
vi.mock("@/lib/ai-route", () => ({ withAiRoute: (route: unknown) => route }));
vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () =>
    authorized
      ? { ok: true, caller: { id: "author" } }
      : { ok: false, response: NextResponse.json({ error: "Sem acesso" }, { status: 403 }) },
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => {
      const filters: ((row: Row) => boolean)[] = [];
      let inserted: Row | undefined;
      let patch: Row | undefined;
      const selected = () =>
        tables[table]?.filter((row) => filters.every((filter) => filter(row))) ?? [];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return query;
        },
        or: () => query,
        order: () => query,
        limit: () => query,
        insert: (row: Row) => {
          inserted = { id: "message", ...row };
          return query;
        },
        update: (row: Row) => {
          patch = row;
          return query;
        },
        single: async () => ({ data: inserted ?? selected()[0], error: null }),
        maybeSingle: async () => ({ data: selected()[0] ?? null, error: null }),
        // biome-ignore lint/suspicious/noThenProperty: fronteira PostgREST
        then: (resolve: (result: unknown) => unknown) => {
          if (patch) for (const row of selected()) Object.assign(row, patch);
          return resolve({ data: selected(), error: null });
        },
      };
      return query;
    },
  },
}));
const { POST } = await import("../nutrition/chat/[studentId]/save-meals/route");
const proposal = {
  plan_name: "Plano",
  plan_type: "unique",
  meals: [{ name: "Almoço", items: [{ food_name: "Arroz", quantity: 100, unit: "g" }] }],
};
const state = () => tables.ai_chat_sessions[0].state as Row;
function request(planId = "draft") {
  return new NextRequest("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "chat", planId }),
  });
}
const context = { params: Promise.resolve({ studentId: "student" }) };
beforeEach(() => {
  authorized = true;
  writeFailure = false;
  tables = {
    student_consents: [
      { student_id: "student", consent_type: "health_data_collection", given_at: "2026-09-01" },
    ],
    ai_chat_sessions: [
      {
        id: "chat",
        student_id: "student",
        specialist_id: "author",
        module: "nutrition",
        state: { draftPlanId: "draft", savedDietPlanId: "draft", pendingDietMeals: proposal },
      },
    ],
    diet_plans: [
      {
        id: "draft",
        student_id: "student",
        specialist_id: "author",
        status: "draft",
        plan_type: "unique",
      },
    ],
    foods: [{ id: "food", name: "Arroz" }],
  };
  rpc.mockReset().mockImplementation(async (name: string, args: Row) => {
    if (name === "reivindicar_proposta") {
      const pending = state().pendingDietMeals ?? null;
      delete state().pendingDietMeals;
      return { data: pending, error: null };
    }
    if (name === "devolver_proposta") {
      state().pendingDietMeals = args.p_valor;
      return { error: null };
    }
    return writeFailure
      ? { data: null, error: { message: "Falha simulada" } }
      : { data: [{ id: "meal", name: "Almoço" }], error: null };
  });
});

it("aprova uma única vez o lote revisado no rascunho aberto", async () => {
  expect((await POST(request(), context)).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("append_diet_draft_meals", {
    p_plan_id: "draft",
    p_student_id: "student",
    p_specialist_id: "author",
    p_meals: [
      {
        name: "Almoço",
        meal_time: null,
        day_of_week: null,
        items: [{ food_id: "food", quantity: 100, unit: "g" }],
      },
    ],
  });
  expect((await POST(request(), context)).status).toBe(400);
  expect(rpc.mock.calls.filter(([name]) => name === "append_diet_draft_meals")).toHaveLength(1);
});

// Art. 6°, VII e Art. 11: service_role exige autorização antes de consumir a proposta.
it.each([
  "denied",
  "revoked",
  "another-author",
  "another-module",
  "active",
  "another-plan",
])("não grava nem consome proposta sem autorização: %s", async (reason) => {
  if (reason === "denied") authorized = false;
  if (reason === "revoked") tables.student_consents[0].revoked_at = "2026-09-02";
  if (reason === "another-author") tables.diet_plans[0].specialist_id = "stranger";
  if (reason === "another-module") tables.ai_chat_sessions[0].module = "workout";
  if (reason === "active") tables.diet_plans[0].status = "active";
  const response = await POST(request(reason === "another-plan" ? "other" : "draft"), context);
  expect(
    response.status,
    "PRESCRIÇÃO INDEVIDA: aprovação autorizada fora do rascunho",
  ).toBeGreaterThanOrEqual(400);
  if (reason === "revoked") {
    expect(await response.json()).toMatchObject({ code: "consent_required" });
  }
  expect(rpc, "PROPOSTA CONSUMIDA: a recusa chegou depois da reivindicação").not.toHaveBeenCalled();
  expect(state().pendingDietMeals).toEqual(proposal);
});
it("devolve a proposta quando o banco recusa o lote, permitindo tentar novamente", async () => {
  writeFailure = true;
  expect((await POST(request(), context)).status).toBe(500);
  expect(state().pendingDietMeals).toEqual(proposal);
  writeFailure = false;
  expect((await POST(request(), context)).status).toBe(200);
});
