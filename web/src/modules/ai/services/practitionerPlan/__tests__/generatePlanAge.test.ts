import { beforeEach, describe, expect, it, vi } from "vitest";

let respostas: Record<string, unknown>;
let pediuIa: boolean;

/** Uma cadeia do PostgREST que termina na linha da tabela pedida. */
function consulta(tabela: string) {
  const linha =
    tabela === "student_anamnesis" ? { responses: respostas } : { persona_track: "beginner" };
  const cadeia: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "gte", "not", "order", "limit", "in", "is"]) {
    cadeia[metodo] = () => cadeia;
  }
  cadeia.maybeSingle = async () => ({ data: tabela === "body_scans" ? null : linha, error: null });
  return cadeia;
}

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: consulta } }));
// O SDK do provedor não carrega no jsdom, e a recusa vem antes de qualquer provedor.
vi.mock("../../../ai.config", () => ({ aiProviders: {} }));
vi.mock("../../../providers/turnoUnico", () => ({
  responderEmUmTurno: async () => {
    pediuIa = true;
    throw new Error("a IA não deveria ser chamada");
  },
}));

const { generatePractitionerPlan } = await import("../generatePlan");

/**
 * TRAVA — o plano automático é só para maiores de 18 (ADR-0044; LGPD Art. 14).
 * A O4 barra o menor no aparelho; o servidor confere de novo, em todo caminho,
 * porque "só treino" já chegou a pular a única tela que pergunta a idade.
 */
describe("gerar o plano do Praticante sem idade de adulto", () => {
  beforeEach(() => {
    pediuIa = false;
  });

  it.each([
    ["menor de 18", { plan_scope: "training", age: 16 }],
    ["sem idade", { plan_scope: "training" }],
  ])("recusa %s antes de pedir à IA", async (_caso, gravadas) => {
    respostas = gravadas;
    const resultado = await generatePractitionerPlan("aluno-1");
    if (resultado.ok || pediuIa) {
      throw new Error("MENOR NO PLANO AUTOMÁTICO: o servidor montou plano sem idade de adulto");
    }
    expect(resultado).toEqual({ ok: false, reason: "under_age" });
  });
});
