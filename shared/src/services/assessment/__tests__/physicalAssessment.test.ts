import { describe, expect, it, vi } from "vitest";
import type { PhysicalAssessment } from "../../../types/physicalAssessment.types";
import {
  type AssessmentTransport,
  assessmentActions,
  assessmentDraft,
  bodyMassIndex,
  createPhysicalAssessmentClient,
  MISSING_SCALE_MESSAGE,
  parseAssessmentDraft,
  professionalSeries,
  weightDeltaKg,
} from "../physicalAssessment";

function assessment(overrides: Partial<PhysicalAssessment> = {}): PhysicalAssessment {
  return {
    ...(Object.fromEntries(
      Object.keys(assessmentDraft(null)).map((key) => [key, null]),
    ) as unknown as PhysicalAssessment),
    id: "a-1",
    student_id: "aluno-1",
    specialist_id: "especialista-1",
    measured_by: "specialist",
    assessed_at: "2026-10-01",
    correction_version: 0,
    created_at: "2026-10-01T10:00:00Z",
    weight_kg: 80,
    height_cm: 180,
    ...overrides,
  };
}

const author = { id: "especialista-1", canUpdate: true, canRead: true };

describe("travas LGPD da avaliação física", () => {
  // Art. 18, III + ADR-0030: a medida declarada pelo aluno é dele, e só ele a
  // corrige. Oferecer "Corrigir" ao especialista sobre ela seria reescrever a
  // declaração do titular com a autoridade de quem não a fez.
  it("especialista não corrige medida declarada pelo aluno", () => {
    const declared = assessment({ measured_by: "self", specialist_id: "especialista-1" });

    expect(
      assessmentActions(declared, author, "aluno-1").canCorrect,
      "MEDIDA DO TITULAR REESCRITA: o especialista recebeu 'Corrigir' numa medida declarada",
    ).toBe(false);
  });

  // Art. 6°, VII: a retificação é do autor. Outro especialista vinculado ao mesmo
  // aluno não reescreve a medida que não tomou, nem lê as versões retificadas dela.
  it("outro especialista não corrige nem lê o histórico de avaliação alheia", () => {
    const other = { id: "especialista-2", canUpdate: true, canRead: true };
    const actions = assessmentActions(assessment(), other, "aluno-1");

    expect(actions.canCorrect, "AVALIAÇÃO ALHEIA CORRIGÍVEL por quem não a mediu").toBe(false);
    expect(actions.canSeeHistory, "ACERVO RETIFICADO EXPOSTO a outro especialista").toBe(false);
  });

  // Art. 46: URL entra em log de servidor e de proxy. Medida de saúde vai só no corpo.
  it("a medida nunca vai na URL", async () => {
    const send = vi.fn().mockResolvedValue({ assessment: assessment() });
    const transport: AssessmentTransport = { get: vi.fn(), send };
    const client = createPhysicalAssessmentClient(transport);

    await client.create("aluno-1", { weight_kg: 81.4, height_cm: 179 });
    await client.correct(assessment({ weight_kg: 83.2 }), { weight_kg: 82.6 });

    for (const [, path, body] of send.mock.calls) {
      expect(path, `MEDIDA NA URL: ${path}`).not.toMatch(/81\.4|179|83\.2|82\.6/);
      expect(JSON.stringify(body)).toMatch(/8[123]\.\d/);
    }
  });
});

describe("assessmentActions", () => {
  it("o autor corrige e lê o histórico da própria avaliação", () => {
    expect(assessmentActions(assessment(), author, "aluno-1")).toEqual({
      canCorrect: true,
      canSeeHistory: true,
    });
  });

  it("o aluno lê o histórico da própria avaliação, mas não a corrige", () => {
    const student = { id: "aluno-1", canUpdate: false, canRead: true };
    expect(assessmentActions(assessment(), student, "aluno-1")).toEqual({
      canCorrect: false,
      canSeeHistory: true,
    });
  });

  it("sessão sem id não ganha ação nenhuma", () => {
    const loading = { id: "", canUpdate: true, canRead: true };
    expect(assessmentActions(assessment({ specialist_id: null }), loading, "")).toEqual({
      canCorrect: false,
      canSeeHistory: false,
    });
  });
});

describe("série e números da ficha", () => {
  it("a série profissional deixa de fora a medida declarada (ADR-0030)", () => {
    const series = professionalSeries([
      assessment({ id: "fita" }),
      assessment({ id: "declarada", measured_by: "self" }),
    ]);
    expect(series.map((a) => a.id)).toEqual(["fita"]);
  });

  it("variação de peso contra a anterior, e nula sem anterior", () => {
    expect(weightDeltaKg(assessment({ weight_kg: 78.8 }), assessment({ weight_kg: 80 }))).toBe(
      -1.2,
    );
    expect(weightDeltaKg(assessment(), null)).toBeNull();
  });

  it("IMC com uma casa, nulo sem altura", () => {
    expect(bodyMassIndex({ weight_kg: 80, height_cm: 180 })).toBe(24.7);
    expect(bodyMassIndex({ weight_kg: 80, height_cm: null })).toBeNull();
  });
});

describe("parseAssessmentDraft", () => {
  it("aceita vírgula decimal e manda vazio como nulo", () => {
    const parsed = parseAssessmentDraft({
      ...assessmentDraft(null),
      weight_kg: "80,5",
      height_cm: "180",
      circ_waist: "",
    });
    expect(parsed).toEqual({
      ok: true,
      values: expect.objectContaining({ weight_kg: 80.5, height_cm: 180, circ_waist: null }),
    });
  });

  it("recusa ficha sem a escala", () => {
    expect(parseAssessmentDraft({ ...assessmentDraft(null), weight_kg: "80" })).toEqual({
      ok: false,
      message: MISSING_SCALE_MESSAGE,
    });
  });

  it("recusa texto que não é número, dizendo o campo e o valor", () => {
    const parsed = parseAssessmentDraft({
      ...assessmentDraft(null),
      weight_kg: "80",
      height_cm: "1,80m",
    });
    expect(parsed).toEqual({ ok: false, message: expect.stringContaining('"1,80m"') });
  });
});

describe("createPhysicalAssessmentClient", () => {
  it("a correção leva a ficha como foi aberta, para o banco recusar edição concorrente", async () => {
    const send = vi.fn().mockResolvedValue({ assessment: assessment() });
    const client = createPhysicalAssessmentClient({ get: vi.fn(), send });

    await client.correct(assessment({ correction_version: 2 }), { weight_kg: 79 });

    expect(send).toHaveBeenCalledWith(
      "PATCH",
      "/api/students/aluno-1/assessments/a-1",
      {
        expected: expect.objectContaining({ weight_kg: 80, correction_version: 2 }),
        changes: { weight_kg: 79 },
      },
      expect.any(String),
    );
  });
});
