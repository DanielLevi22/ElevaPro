import { describe, expect, it } from "vitest";
import type { StudentContext } from "../../types";
import { type BlocoDeContexto, resumirDisponibilidade } from "../disponibilidade";

/**
 * O que a tela pode dizer sobre o aluno antes da primeira mensagem.
 *
 * Dois eixos: a disponibilidade tem que ser verdadeira (sem consentimento não é
 * o mesmo que sem dado), e o valor do dado de saúde não pode atravessar —
 * "asma" na tela é tratamento de dado sensível com base legal própria.
 */

const CONTEXTO_VAZIO: StudentContext = {
  studentId: "aluno-1",
  health: {},
  healthUnavailableReason: null,
  periodizations: [],
};

const bloco = (blocos: BlocoDeContexto[], key: BlocoDeContexto["key"]): BlocoDeContexto => {
  const encontrado = blocos.find((b) => b.key === key);
  if (!encontrado) throw new Error(`bloco ${key} não veio`);
  return encontrado;
};

describe("resumirDisponibilidade", () => {
  it("responde pelos quatro blocos, sempre", () => {
    const blocos = resumirDisponibilidade(CONTEXTO_VAZIO, false);

    expect(blocos.map((b) => b.key)).toEqual([
      "anamnese",
      "avaliacao",
      "body_scan",
      "periodizacoes",
    ]);
    expect(blocos.every((b) => b.present === false)).toBe(true);
  });

  it("separa o que veio da anamnese do que veio da avaliação", () => {
    const blocos = resumirDisponibilidade(
      { ...CONTEXTO_VAZIO, health: { injuries: "hérnia de disco L5" } },
      false,
    );

    expect(bloco(blocos, "anamnese").present).toBe(true);
    expect(bloco(blocos, "avaliacao").present).toBe(false);
  });

  it("reconhece a avaliação física pelas medidas", () => {
    const blocos = resumirDisponibilidade(
      { ...CONTEXTO_VAZIO, health: { weightKg: 82, heightCm: 178 } },
      false,
    );

    expect(bloco(blocos, "avaliacao").present).toBe(true);
    expect(bloco(blocos, "anamnese").present).toBe(false);
  });

  it("conta as periodizações salvas", () => {
    const uma = resumirDisponibilidade(
      {
        ...CONTEXTO_VAZIO,
        periodizations: [{ id: "p1", name: "Hipertrofia", goal: "", status: "active", phases: [] }],
      },
      false,
    );
    expect(bloco(uma, "periodizacoes").detail).toBe("1 salva");

    const duas = resumirDisponibilidade(
      {
        ...CONTEXTO_VAZIO,
        periodizations: [
          { id: "p1", name: "A", goal: "", status: "active", phases: [] },
          { id: "p2", name: "B", goal: "", status: "planned", phases: [] },
        ],
      },
      false,
    );
    expect(bloco(duas, "periodizacoes").detail).toBe("2 salvas");
  });

  it("marca a análise corporal pelo índice que o contexto trouxe", () => {
    expect(bloco(resumirDisponibilidade(CONTEXTO_VAZIO, true), "body_scan").present).toBe(true);
  });

  // Sem consentimento o aluno pode ter a anamnese inteira preenchida e o coach
  // continuar sem poder lê-la. Dizer "não respondida" mandaria o especialista
  // pedir de novo o que já existe.
  it("diz que falta consentimento, não que falta dado", () => {
    const blocos = resumirDisponibilidade(
      { ...CONTEXTO_VAZIO, health: null, healthUnavailableReason: "no_consent" },
      false,
    );

    expect(bloco(blocos, "anamnese")).toEqual({
      key: "anamnese",
      label: "Anamnese",
      present: false,
      detail: "sem consentimento do aluno",
    });
  });

  // LGPD Art. 11: a existência do dado é neutra, o valor não é. Se um valor de
  // saúde aparecer aqui, ele aparece na tela e vira tratamento com base legal e
  // destinatário próprios, sem nada disso ter sido decidido.
  it("VALOR DE SAÚDE NÃO ATRAVESSA — só a existência", () => {
    const blocos = resumirDisponibilidade(
      {
        ...CONTEXTO_VAZIO,
        health: {
          injuries: "hérnia de disco L5",
          healthConditions: "asma",
          objective: "emagrecimento",
          weightKg: 82,
          heightCm: 178,
          bodyFatPct: 24,
        },
      },
      true,
    );

    const serializado = JSON.stringify(blocos);
    for (const valor of ["hérnia", "asma", "emagrecimento", "82", "178", "24"]) {
      expect(
        serializado.includes(valor),
        `DADO DE SAÚDE NA TELA: "${valor}" atravessou a disponibilidade`,
      ).toBe(false);
    }
  });
});
