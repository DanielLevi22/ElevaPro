import type { BodyScanRecord } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { descreverScanParaFerramenta } from "../bodyScanContext";

/**
 * O que a ferramenta `query_body_scan` entrega a quem vai prescrever.
 *
 * O bloco medido não existia aqui: a ferramenta devolvia as notas do modelo e
 * as circunferências estimadas, e o desnível de ombro, a anteriorização de
 * cabeça e os prumos — que são medida de verdade e mudam decisão de unilateral
 * e mobilidade — morriam na tela do aluno.
 */

function scan(sobrescreve: Partial<BodyScanRecord> = {}): BodyScanRecord {
  return {
    id: "scan-1",
    scanned_at: "2026-08-31T12:00:00Z",
    circ_waist: 89,
    body_fat_pct: 24,
    ...sobrescreve,
  } as BodyScanRecord;
}

function resultado(latest: BodyScanRecord | null) {
  return JSON.parse(descreverScanParaFerramenta(latest, null, []));
}

describe("o body scan que chega a quem prescreve", () => {
  it("entrega a medida do aparelho, com lado", () => {
    const json = resultado(
      scan({ shoulder_drop_cm: -1.8, shoulder_tilt_deg: -2.3, plumb_shoulder_cm: 5 }),
    );

    expect(json.medido_no_aparelho).toContainEqual(
      expect.objectContaining({
        medida: "Desnível dos ombros",
        valor: 1.8,
        lado: "esquerdo mais alto",
      }),
    );
    expect(json.medido_no_aparelho).toContainEqual(
      expect.objectContaining({ medida: "Ombro à frente do prumo", valor: 5 }),
    );
  });

  // O aviso de erro de 5 a 10% vale para a circunferência estimada, não para a
  // geometria medida. Num bloco só, ele contaminaria as duas.
  it("mantém medido e estimado em blocos separados", () => {
    const json = resultado(scan({ shoulder_drop_cm: 1.8 }));

    expect(json.medidas_estimadas.cintura).toBe(89);
    expect(json.aviso).toContain("ESTIMADAS");
    expect(json.medido_no_aparelho).toHaveLength(1);
  });

  // Medida sem a ressalva faz quem prescreve decidir achando que está firme.
  it("manda a ressalva da captura junto", () => {
    const json = resultado(
      scan({ shoulder_drop_cm: 1.8, trunk_rotated: true, framing_confirmed: false }),
    );

    expect(json.ressalvas_da_captura.join(" ")).toContain("perspectiva");
    expect(json.ressalvas_da_captura.join(" ")).toContain("deslocada");
  });

  it("não inventa medida quando o aparelho não mediu", () => {
    const json = resultado(scan());

    expect(json.medido_no_aparelho).toEqual([]);
    expect(json.ressalvas_da_captura).toEqual([]);
  });

  it("diz que achado postural não é diagnóstico", () => {
    const json = resultado(scan({ shoulder_drop_cm: 1.8 }));

    expect(json.como_usar).toContain("Não diagnostique");
  });

  it("devolve erro nomeado quando não há análise", () => {
    const json = resultado(null);

    expect(json.erro).toContain("Nenhuma análise corporal");
  });
});
