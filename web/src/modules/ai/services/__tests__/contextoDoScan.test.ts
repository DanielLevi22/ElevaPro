import type { BodyScanRecord } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { descreverContextoDoScan, type EntradaDoContexto } from "../contextoDoScan";

const AGORA = new Date("2026-08-31T12:00:00Z");

function scanAnterior(sobrescreve: Partial<BodyScanRecord> = {}): BodyScanRecord {
  return {
    id: "scan-1",
    student_id: "aluno-1",
    scanned_at: "2026-08-01T12:00:00Z",
    height_cm: 180,
    weight_kg: 80,
    body_fat_pct: 18,
    muscle_mass_kg: null,
    bmi: null,
    circ_chest: null,
    circ_waist: 85,
    circ_hips: null,
    circ_arms: null,
    circ_thighs: null,
    circ_calves: null,
    circ_neck: null,
    circ_shoulders: null,
    posture_symmetry_score: null,
    posture_muscle_score: null,
    posture_overall_score: null,
    framing_mark_top: null,
    framing_mark_bottom: null,
    framing_pitch: null,
    framing_roll: null,
    framing_level_sensor: null,
    framing_camera: null,
    posture_feedback: null,
    recommendations: null,
    ...sobrescreve,
  } as BodyScanRecord;
}

function entrada(sobrescreve: Partial<EntradaDoContexto> = {}): EntradaDoContexto {
  return { anterior: null, anamnese: null, objetivo: null, agora: AGORA, ...sobrescreve };
}

describe("o contexto que a análise corporal passa a receber", () => {
  // O ADR-0010 diz que o valor está na diferença entre dois scans. Sem o
  // anterior no prompt, o modelo descrevia um retrato onde o produto promete
  // um filme.
  it("traz os números do scan anterior e há quantos dias ele foi", () => {
    const texto = descreverContextoDoScan(entrada({ anterior: scanAnterior() }));

    expect(texto).toContain("há 30 dias");
    expect(texto).toContain("cintura: 85");
    expect(texto).toContain("gordura corporal: 18");
  });

  it("omite do anterior o que nunca foi medido, em vez de mandar zero", () => {
    const texto = descreverContextoDoScan(entrada({ anterior: scanAnterior() }));

    expect(texto).not.toContain("quadril");
    expect(texto).not.toContain("null");
  });

  // Recomendação postural para quem tem manguito operado deveria ser outra, e
  // era a mesma.
  it("traz lesão, cirurgia e limitação de mobilidade", () => {
    const texto = descreverContextoDoScan(
      entrada({
        anamnese: {
          injuries: "manguito rotador direito",
          surgeries: "artroscopia em 2024",
          mobility_limitations: ["ombro direito"],
        },
      }),
    );

    expect(texto).toContain("manguito rotador direito");
    expect(texto).toContain("artroscopia em 2024");
    expect(texto).toContain("ombro direito");
  });

  // A anamnese carrega renda, sono, álcool, histórico familiar. Nada disso tem
  // finalidade numa leitura postural, e o recorte é o mesmo do briefing:
  // campo nomeado, nunca o objeto inteiro (Art. 6º, III).
  it("não vaza o resto da anamnese", () => {
    const texto = descreverContextoDoScan(
      entrada({
        anamnese: {
          injuries: "manguito rotador",
          alcohol: "socialmente",
          family_history: "diabetes na família",
          sleep_hours: "5",
          medications: "sertralina",
        },
      }),
    );

    expect(texto).toContain("manguito rotador");
    expect(texto).not.toContain("socialmente");
    expect(texto).not.toContain("diabetes");
    expect(texto).not.toContain("sertralina");
    expect(texto).not.toContain("5");
  });

  it("ignora campo vazio como se não existisse", () => {
    expect(descreverContextoDoScan(entrada({ anamnese: { injuries: "  " } }))).toBeNull();
  });

  // Cabeçalho sem conteúdo faria o modelo procurar um contexto que não veio.
  it("devolve null quando não há contexto nenhum", () => {
    expect(descreverContextoDoScan(entrada())).toBeNull();
  });

  it("manda comparar, não perseguir um alvo", () => {
    const texto = descreverContextoDoScan(entrada({ anterior: scanAnterior() }));

    expect(texto).toContain("diga o que mudou");
    expect(texto).toContain("A diferença é o");
  });

  it("proíbe atribuir achado postural à lesão sem a imagem sustentar", () => {
    const texto = descreverContextoDoScan(entrada({ anamnese: { current_pain: "lombar" } }));

    expect(texto).toContain("sem que a imagem sustente");
  });
});
