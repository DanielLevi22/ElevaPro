import { describe, expect, it } from "vitest";
import { decideScanEligibility, resolveScale } from "../escala";

const AVALIACAO = { height_cm: 178, weight_kg: 82.5 };

describe("precedência da Escala", () => {
  // A Assessment vence porque é medida com fita pelo especialista; a Anamnese é
  // declaração do aluno. Quando as duas existem, usar a declarada seria trocar
  // uma medida por uma lembrança.
  it("usa a avaliação do especialista quando ela existe", () => {
    const anamnese = { height: 170, weight: 70 };

    expect(
      resolveScale({ specialistAssessment: AVALIACAO, declaredAssessment: null, anamnese }),
    ).toEqual({
      ok: true,
      heightCm: 178,
      weightKg: 82.5,
      fonte: "assessment",
    });
  });
});

describe("a medida declarada entre as duas", () => {
  // A declarada é digitada pelo aluno, como a anamnese, mas é a medida mais recente
  // dele. Vence a anamnese; perde para a fita do especialista (0056, #312).
  it("usa a declarada quando não há medida do especialista, e grava a origem self", () => {
    const declarada = { height_cm: 176, weight_kg: 79 };

    expect(
      resolveScale({
        specialistAssessment: null,
        declaredAssessment: declarada,
        anamnese: { height: 170, weight: 70 },
      }),
    ).toEqual({ ok: true, heightCm: 176, weightKg: 79, fonte: "self" });
  });

  it("a medida do especialista vence a declarada", () => {
    expect(
      resolveScale({
        specialistAssessment: AVALIACAO,
        declaredAssessment: { height_cm: 176, weight_kg: 79 },
        anamnese: null,
      }),
    ).toMatchObject({ heightCm: 178, fonte: "assessment" });
  });
});

describe("a Anamnese como terceira fonte", () => {
  // O aluno não pode ficar preso esperando o especialista cadastrar a avaliação
  // dele. Sem Assessment, a declaração da Anamnese calibra — e o scan registra
  // que foi declarada, para o especialista saber o peso do número que lê.
  it("cai para a anamnese quando não há avaliação", () => {
    const anamnese = { height: 170, weight: 70 };

    expect(
      resolveScale({ specialistAssessment: null, declaredAssessment: null, anamnese }),
    ).toEqual({
      ok: true,
      heightCm: 170,
      weightKg: 70,
      fonte: "anamnese",
    });
  });

  // A leitura passa pelo normalizador compartilhado: a anamnese guarda o que o
  // aluno digitou, e quem respondeu em metro ou com vírgula respondeu certo.
  it("normaliza o que o aluno digitou", () => {
    const anamnese = {
      height: { questionId: "height", value: "1,70" },
      weight: { questionId: "weight", value: "70,5" },
    };

    expect(
      resolveScale({ specialistAssessment: null, declaredAssessment: null, anamnese }),
    ).toEqual({
      ok: true,
      heightCm: 170,
      weightKg: 70.5,
      fonte: "anamnese",
    });
  });
});

describe("recusa da Escala", () => {
  // Recusa é resultado, não erro: o portão precisa dizer ao aluno o que fazer,
  // e "responda a anamnese" é ação diferente de "corrija sua altura". Um motivo
  // só para os dois faria a tela mandar responder de novo quem já respondeu.
  const casos: [string, string, Record<string, unknown> | null][] = [
    ["nunca respondeu a anamnese", "sem_anamnese", null],
    ["anamnese vazia", "sem_anamnese", {}],
    ["altura por extenso", "altura_invalida", { height: "um e setenta", weight: 70 }],
    ["altura implausível", "altura_invalida", { height: 300, weight: 70 }],
    ["peso em branco", "peso_invalido", { height: 170 }],
  ];

  it.each(casos)("%s recusa como %s", (_titulo, motivo, anamnese) => {
    expect(
      resolveScale({ specialistAssessment: null, declaredAssessment: null, anamnese }),
    ).toEqual({ ok: false, motivo });
  });

  // A altura é conferida antes do peso: mandar corrigir os dois de uma vez
  // esconde qual deles a tela deve destacar.
  it("nomeia a altura primeiro quando os dois estão ruins", () => {
    const anamnese = { height: "abc", weight: "abc" };

    expect(
      resolveScale({ specialistAssessment: null, declaredAssessment: null, anamnese }),
    ).toEqual({
      ok: false,
      motivo: "altura_invalida",
    });
  });
});

describe("decisão do portão de elegibilidade", () => {
  const anamnese = { height: 170, weight: 70 };

  // Consentimento antes de escala: sem base legal o dado de saúde não deve nem
  // ser lido para decidir se o aluno pode escanear (Art. 11, I).
  it("recusa por consentimento sem sequer olhar a escala", () => {
    expect(
      decideScanEligibility({
        temConsentimento: false,
        specialistAssessment: AVALIACAO,
        declaredAssessment: null,
        anamnese,
      }),
    ).toEqual({ podeEscanear: false, motivo: "consentimento" });
  });

  it("libera quando há consentimento e escala, dizendo a fonte", () => {
    expect(
      decideScanEligibility({
        temConsentimento: true,
        specialistAssessment: AVALIACAO,
        declaredAssessment: null,
        anamnese,
      }),
    ).toEqual({ podeEscanear: true, fonte: "assessment" });
  });

  it("repassa o motivo da escala quando ela recusa", () => {
    expect(
      decideScanEligibility({
        temConsentimento: true,
        specialistAssessment: null,
        declaredAssessment: null,
        anamnese: null,
      }),
    ).toEqual({ podeEscanear: false, motivo: "sem_anamnese" });
  });

  // TRAVA LGPD (Art. 6º, III): o app precisa saber SE pode escanear e DE ONDE
  // viria a escala. O valor da medida não tem uso nenhum na decisão de abrir a
  // câmera, e mandá-lo seria dado de saúde atravessando a fronteira à toa.
  it("nunca devolve altura nem peso no payload", () => {
    const liberado = decideScanEligibility({
      temConsentimento: true,
      specialistAssessment: AVALIACAO,
      declaredAssessment: null,
      anamnese,
    });

    const serializado = JSON.stringify(liberado);
    expect(serializado).not.toContain("178");
    expect(serializado).not.toContain("82.5");
    expect(Object.keys(liberado)).toEqual(["podeEscanear", "fonte"]);
  });
});
