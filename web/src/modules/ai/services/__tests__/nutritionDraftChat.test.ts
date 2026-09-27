import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
let rows: Record<string, Row[]>;

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: ((row: Row) => boolean)[] = [];
      let inserted: Row | undefined;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push((row) => {
            if (column.startsWith("state->>")) {
              return (row.state as Row)?.[column.slice(8)] === value;
            }
            return row[column] === value;
          });
          return query;
        },
        order: () => query,
        is: (column: string, value: unknown) => {
          filters.push((row) => (row[column] ?? null) === value);
          return query;
        },
        limit: () => query,
        insert: (row: Row) => {
          inserted = { id: "new-session", ...row };
          return query;
        },
        maybeSingle: async () => ({
          data: rows[table]?.find((row) => filters.every((filter) => filter(row))) ?? null,
          error: null,
        }),
        single: async () => ({ data: inserted, error: null }),
      };
      return query;
    },
  },
}));

const { resolveNutritionChat, loadNutritionDraft, nutritionDraftPrompt } = await import(
  "../nutritionDraftChat"
);

beforeEach(() => {
  rows = {
    student_consents: [
      {
        student_id: "student",
        consent_type: "health_data_collection",
        given_at: "2026-09-01",
        revoked_at: null,
      },
    ],
    diet_plans: [
      {
        id: "draft",
        student_id: "student",
        specialist_id: "author",
        status: "draft",
        plan_type: "unique",
        target_calories: 2000,
        dietary_restrictions: ["lactose_free"],
      },
    ],
    ai_chat_sessions: [
      {
        id: "draft-session",
        student_id: "student",
        specialist_id: "author",
        module: "nutrition",
        state: { draftPlanId: "draft", savedDietPlanId: "draft" },
      },
    ],
  };
});

describe("conversa do rascunho de dieta", () => {
  it("não retoma automaticamente uma conversa arquivada pelo botão do plano", async () => {
    rows.ai_chat_sessions[0].archived_at = "2026-09-27";
    const session = await resolveNutritionChat({
      studentId: "student",
      specialistId: "author",
      planId: "draft",
    });
    expect(session.id).toBe("new-session");
  });
  it.each([
    "active",
    "finished",
  ])("reabre a conversa do plano %s sem liberar gravação", async (status) => {
    rows.diet_plans[0].status = status;
    const scope = { studentId: "student", specialistId: "author", sessionId: "draft-session" };
    const conversation = await resolveNutritionChat({ ...scope, intent: "conversation" });
    expect(conversation.id).toBe("draft-session");
    expect(conversation.draft).toBeNull();
    expect(conversation.closedPlanId).toBe("draft");
    await expect(
      resolveNutritionChat(scope),
      "PRESCRIÇÃO ALTERÁVEL: aprovação liberada após envio",
    ).rejects.toThrow();
  });
  it("retoma a conversa do rascunho aberto em vez da conversa mais recente do aluno", async () => {
    const session = await resolveNutritionChat({
      studentId: "student",
      specialistId: "author",
      planId: "draft",
    });
    expect(session.id).toBe("draft-session");
    expect(session.draft?.target_calories).toBe(2000);
  });
  // Art. 6°, III: o nome/notas podem identificar o titular e não orientam a montagem.
  it("não envia nome, notas ou identificadores do rascunho ao provedor", async () => {
    Object.assign(rows.diet_plans[0], { name: "Nome privado", notes: "Nota privada" });
    const draft = await loadNutritionDraft("draft", "student", "author");
    const prompt = nutritionDraftPrompt(draft);
    expect(prompt, "DADO EXCESSIVO: identidade ou nota livre saiu para a IA").not.toMatch(
      /Nome privado|Nota privada|student_id|specialist_id|"id"/,
    );
    expect(prompt).toContain("lactose_free");
  });
  // Art. 6°, VII e Art. 11: o service_role não pode contornar autor, estado ou consentimento.
  it.each([
    "active",
    "finished",
    "another-author",
    "revoked",
    "no-consent",
  ])("não abre um rascunho indisponível: %s", async (reason) => {
    if (reason === "active" || reason === "finished") rows.diet_plans[0].status = reason;
    if (reason === "another-author") rows.diet_plans[0].specialist_id = "another-author";
    if (reason === "revoked") rows.student_consents[0].revoked_at = "2026-09-02";
    if (reason === "no-consent") rows.student_consents = [];
    await expect(
      loadNutritionDraft("draft", "student", "author"),
      "PRESCRIÇÃO EXPOSTA: acesso sem autorização ou fora do rascunho",
    ).rejects.toThrow();
  });
  // Art. 6°, VII: a conversa não pode carregar a proposta de outro plano ou módulo.
  it("não reaproveita uma sessão de outro rascunho", async () => {
    rows.ai_chat_sessions[0].state = { draftPlanId: "another-draft" };
    await expect(
      resolveNutritionChat({
        studentId: "student",
        specialistId: "author",
        planId: "draft",
        sessionId: "draft-session",
      }),
      "PLANO ERRADO: conversa foi associada a outro rascunho",
    ).rejects.toThrow();
  });
  it("inicia uma conversa limpa quando a criação pede nova sessão", async () => {
    const session = await resolveNutritionChat({
      studentId: "student",
      specialistId: "author",
      fresh: true,
    });
    expect(session).toEqual({ id: "new-session", draft: null, closedPlanId: undefined });
  });
  it("recusa estado com destino de gravação diferente do rascunho da conversa", async () => {
    rows.ai_chat_sessions[0].state = { draftPlanId: "draft", savedDietPlanId: "other" };
    await expect(
      resolveNutritionChat({
        studentId: "student",
        specialistId: "author",
        planId: "draft",
        sessionId: "draft-session",
      }),
      "DESTINO TROCADO: a gravação poderia atingir outro plano",
    ).rejects.toThrow();
  });
});
