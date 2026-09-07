import { beforeEach, describe, expect, it, vi } from "vitest";
import { readAnamnesis } from "../specialistContextLoader";

/**
 * O contexto que vai para a Anthropic.
 *
 * Estes testes existem porque os dois defeitos anteriores eram invisíveis: a
 * anamnese era lida fora de `responses` e a avaliação consultava colunas que não
 * existem, com o erro descartado. Uma aluna com "Hérnia de disco L5-S1" chegava
 * ao modelo como "Lesões: nenhuma registrada".
 */

interface TableResult {
  data: unknown;
  error: unknown;
}

let tables: Record<string, TableResult>;
/** Colunas pedidas por tabela — é como afirmamos o recorte do payload. */
let selected: Record<string, string>;

const mockFrom = vi.fn((table: string) => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.select = vi.fn((columns: string) => {
    selected[table] = columns;
    return builder;
  });
  builder.maybeSingle = vi.fn(async () => tables[table] ?? { data: null, error: null });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve(tables[table] ?? { data: [], error: null });
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}));

const { formatContextForPrompt, loadStudentContext } = await import("../specialistContextLoader");

const COM_CONSENTIMENTO = { data: { given_at: "2026-01-01", revoked_at: null }, error: null };

const ANAMNESE = {
  data: {
    responses: {
      objective: "Hipertrofia",
      training_experience: "Intermediário",
      training_frequency: 4,
      available_days: "Seg, Ter, Qui",
      injuries: "Hérnia de disco L5-S1 — proibido agachamento livre",
      health_conditions: "Hipertensão controlada",
    },
  },
  error: null,
};

const AVALIACAO = {
  data: { weight_kg: 82.5, height_cm: 178, body_fat_pct: 21.4, assessed_at: "2026-08-01" },
  error: null,
};

beforeEach(() => {
  // Sem isto, as chamadas de um teste vazam para o seguinte e a asserção de
  // "não consultou a anamnese" passa a ver a consulta do teste anterior.
  vi.clearAllMocks();
  selected = {};
  tables = {
    student_consents: COM_CONSENTIMENTO,
    student_anamnesis: ANAMNESE,
    physical_assessments: AVALIACAO,
    training_periodizations: { data: [], error: null },
  };
});

describe("loadStudentContext", () => {
  it("lê a anamnese de dentro de responses", async () => {
    const ctx = await loadStudentContext("aluno-1", "espec-1");

    expect(ctx.health?.injuries).toBe("Hérnia de disco L5-S1 — proibido agachamento livre");
    expect(ctx.health?.healthConditions).toBe("Hipertensão controlada");
    expect(ctx.health?.objective).toBe("Hipertrofia");
  });

  it("lê a avaliação pelos nomes reais das colunas", async () => {
    const ctx = await loadStudentContext("aluno-1", "espec-1");

    expect(selected.physical_assessments).toBe("weight_kg, height_cm, body_fat_pct, assessed_at");
    expect(ctx.health?.weightKg).toBe(82.5);
    expect(ctx.health?.heightCm).toBe(178);
  });

  // O `select("*")` lia a anamnese inteira do banco para usar seis campos.
  it("pede só a coluna que usa da anamnese", async () => {
    await loadStudentContext("aluno-1", "espec-1");

    expect(selected.student_anamnesis).toBe("responses");
    expect(selected.student_anamnesis).not.toContain("*");
  });

  // Falha e ausência tinham a mesma aparência — foi assim que o 42703 passou
  // despercebido por meses.
  it("propaga erro da avaliação em vez de virar 'não registrado'", async () => {
    tables.physical_assessments = {
      data: null,
      error: { code: "42703", message: "column does not exist" },
    };

    await expect(loadStudentContext("aluno-1", "espec-1")).rejects.toMatchObject({ code: "42703" });
  });

  it("propaga erro da anamnese", async () => {
    tables.student_anamnesis = { data: null, error: { message: "boom" } };

    await expect(loadStudentContext("aluno-1", "espec-1")).rejects.toMatchObject({
      message: "boom",
    });
  });

  it("não expõe o nome do titular", async () => {
    const ctx = await loadStudentContext("aluno-1", "espec-1");

    expect(mockFrom).not.toHaveBeenCalledWith("profiles");
    expect(JSON.stringify(ctx)).not.toContain("full_name");
  });
});

describe("consentimento", () => {
  it("não lê dado de saúde sem consentimento", async () => {
    tables.student_consents = { data: null, error: null };

    const ctx = await loadStudentContext("aluno-1", "espec-1");

    expect(ctx.health).toBeNull();
    expect(ctx.healthUnavailableReason).toBe("no_consent");
    expect(mockFrom).not.toHaveBeenCalledWith("student_anamnesis");
    expect(mockFrom).not.toHaveBeenCalledWith("physical_assessments");
  });

  it("trata consentimento revogado como ausente", async () => {
    tables.student_consents = {
      data: { given_at: "2026-01-01", revoked_at: "2026-06-01" },
      error: null,
    };

    const ctx = await loadStudentContext("aluno-1", "espec-1");

    expect(ctx.health).toBeNull();
  });
});

describe("formatContextForPrompt", () => {
  it("leva a restrição para o prompt", async () => {
    const texto = formatContextForPrompt(await loadStudentContext("aluno-1", "espec-1"));

    expect(texto).toContain("Hérnia de disco L5-S1");
    expect(texto).toContain("Peso: 82.5 kg");
  });

  // Sem isto o modelo trata silêncio como "não tem lesão" e prescreve em cima.
  it("diz que o histórico está indisponível, e proíbe afirmar ausência", async () => {
    tables.student_consents = { data: null, error: null };

    const texto = formatContextForPrompt(await loadStudentContext("aluno-1", "espec-1"));

    expect(texto).toContain("INDISPONÍVEL");
    expect(texto).toContain("Não afirme que ele não tem lesão");
  });

  // A conversa parava na fase 1 de uma periodização de quatro: o contexto
  // listava as quatro iguais, o coach não tinha como saber que três estavam
  // vazias, e quem descobria era o especialista.
  it("marca a fase que ainda não tem treinos", async () => {
    tables.training_periodizations = {
      data: [
        {
          id: "per-1",
          name: "Hipertrofia 2026",
          objective: "Hipertrofia",
          status: "active",
          training_plans: [
            {
              id: "fase-1",
              name: "Ativação",
              duration_weeks: 4,
              focus: "Correção",
              workouts: [{ count: 4 }],
            },
            {
              id: "fase-2",
              name: "Base",
              duration_weeks: 6,
              focus: "Volume",
              workouts: [{ count: 0 }],
            },
          ],
        },
      ],
      error: null,
    };

    const texto = formatContextForPrompt(await loadStudentContext("aluno-1", "espec-1"));

    expect(texto).toContain("[id: fase-1] Ativação: 4 semanas — Correção — 4 treinos");
    expect(texto).toContain("[id: fase-2] Base: 6 semanas — Volume — SEM TREINOS");
  });

  // PostgREST devolve `workouts: []` quando a fase não tem nenhum — ausência de
  // linha, não `count: 0`. Lido como `undefined`, o marcador sumiria justamente
  // da fase que precisa dele.
  it("trata fase sem linha de contagem como sem treinos", async () => {
    tables.training_periodizations = {
      data: [
        {
          id: "per-1",
          name: "Hipertrofia 2026",
          objective: "Hipertrofia",
          status: "active",
          training_plans: [
            { id: "fase-1", name: "Ativação", duration_weeks: 4, focus: "Correção", workouts: [] },
          ],
        },
      ],
      error: null,
    };

    const texto = formatContextForPrompt(await loadStudentContext("aluno-1", "espec-1"));

    expect(texto).toContain("SEM TREINOS");
  });

  it("distingue anamnese em branco de histórico indisponível", async () => {
    tables.student_anamnesis = { data: { responses: {} }, error: null };
    tables.physical_assessments = { data: null, error: null };

    const texto = formatContextForPrompt(await loadStudentContext("aluno-1", "espec-1"));

    expect(texto).toContain("Anamnese ainda não preenchida");
    expect(texto).not.toContain("INDISPONÍVEL");
  });
});

describe("as duas formas gravadas em responses", () => {
  const LESAO = "Hérnia de disco L5-S1 — proibido agachamento livre";

  /** O que o web e a tela adaptativa do mobile gravam. */
  const PLANA = {
    objective: "Hipertrofia",
    injuries: LESAO,
    health_conditions: "Hipertensão controlada",
  };

  /** O que o assistente do mobile grava — a tela do aluno COM especialista. */
  const EMBRULHADA = {
    objective: { questionId: "objective", value: "Hipertrofia" },
    injuries: { questionId: "injuries", value: LESAO },
    health_conditions: { questionId: "health_conditions", value: "Hipertensão controlada" },
  };

  // As duas formas descrevem o mesmo aluno. Se o contexto que chega ao modelo
  // depender de qual tela ele usou, a prescrição também depende — e ninguém
  // percebe, porque o texto corrompido não é vazio e atravessa a checagem de
  // "respondeu?".
  it("produzem o mesmo contexto de saúde", () => {
    expect(readAnamnesis(EMBRULHADA)).toEqual(readAnamnesis(PLANA));
  });

  // REGRESSÃO CLÍNICA: é a terceira vez que este carregador erra a lesão. Antes
  // o campo sumia (lido fora de `responses`, coluna inexistente). Aqui ele
  // chegava como "[object Object]" — pior, porque parece resposta, e o prompt
  // manda o modelo usar exatamente este campo para decidir a carga.
  it("não entregam [object Object] no lugar da lesão do aluno", () => {
    expect(readAnamnesis(EMBRULHADA).injuries).toBe(LESAO);
  });
});
