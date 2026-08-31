import { describe, expect, it } from "vitest";
import type { BodyScanRecord } from "../../types/bodyScan.types";
import { compareScans } from "../bodyScan.service";

function scan(overrides: Partial<BodyScanRecord>): BodyScanRecord {
  return {
    id: "scan-1",
    student_id: "student-1",
    scanned_at: "2026-08-12T10:00:00Z",
    framing_camera: "back",
    height_cm: 175,
    weight_kg: null,
    body_fat_pct: null,
    lean_mass_kg: null,
    px_per_cm_front: null,
    px_per_cm_back: null,
    px_per_cm_side: null,
    shoulder_drop_cm: null,
    shoulder_tilt_deg: null,
    hip_drop_cm: null,
    hip_tilt_deg: null,
    axis_deviation_cm: null,
    trunk_rotated: null,
    plumb_shoulder_cm: null,
    plumb_hip_cm: null,
    plumb_knee_cm: null,
    quality_backlit: null,
    quality_low_light: null,
    quality_blown_out: null,
    framing_confirmed: null,
    bmi: null,
    circ_chest: null,
    circ_waist: null,
    circ_hips: null,
    circ_arms: null,
    circ_thighs: null,
    circ_calves: null,
    circ_neck: null,
    circ_shoulders: null,
    posture_symmetry_score: null,
    posture_muscle_score: null,
    posture_overall_score: null,
    posture_feedback: null,
    recommendations: null,
    ...overrides,
  };
}

describe("compareScans", () => {
  it("devolve a diferença com o sinal preservado", () => {
    const deltas = compareScans(
      scan({ circ_waist: 82, circ_arms: 38 }),
      scan({ circ_waist: 85, circ_arms: 36 }),
    );

    expect(deltas).toEqual([
      { field: "circ_waist", current: 82, previous: 85, change: -3 },
      { field: "circ_arms", current: 38, previous: 36, change: 2 },
    ]);
  });

  it("ignora o campo quando falta em qualquer um dos lados", () => {
    // "Não medido" não é zero. Tratar como zero inventaria uma variação de
    // 82 cm que nunca aconteceu — exatamente o tipo de número fabricado que
    // este módulo existe para impedir.
    const deltas = compareScans(scan({ circ_waist: 82 }), scan({ circ_waist: null }));

    expect(deltas).toEqual([]);
  });

  it("ignora o campo quando falta só no atual", () => {
    const deltas = compareScans(scan({ circ_waist: null }), scan({ circ_waist: 85 }));

    expect(deltas).toEqual([]);
  });

  it("não perde precisão em variação fracionada", () => {
    const deltas = compareScans(scan({ body_fat_pct: 18.4 }), scan({ body_fat_pct: 19.1 }));

    expect(deltas[0].change).toBe(-0.7);
  });

  it("devolve vazio quando não há nenhum campo comparável", () => {
    expect(compareScans(scan({}), scan({}))).toEqual([]);
  });
});

/**
 * Frontal e traseira têm distância focal diferente: o corpo ocupando a mesma
 * fração do quadro não está à mesma distância, e a conversão px/cm muda junto.
 * O tipo já declarava que as duas não são comparáveis; a conta não conferia, e
 * a diferença entre lentes saía como se fosse mudança no corpo.
 */
describe("compareScans e a lente", () => {
  it("não compara scan de lentes diferentes", () => {
    const deltas = compareScans(
      scan({ circ_waist: 82, framing_camera: "front" }),
      scan({ circ_waist: 85, framing_camera: "back" }),
    );

    expect(deltas).toEqual([]);
  });

  it("compara normalmente quando a lente é a mesma", () => {
    const deltas = compareScans(
      scan({ circ_waist: 82, framing_camera: "front" }),
      scan({ circ_waist: 85, framing_camera: "front" }),
    );

    expect(deltas).toHaveLength(1);
  });

  // Não dá para afirmar que duas capturas são comparáveis sem saber de onde
  // vieram — e inventar essa afirmação produz o delta errado que ninguém vê.
  it("não compara quando a lente é desconhecida", () => {
    const semLente = scan({ circ_waist: 82, framing_camera: null });

    expect(compareScans(semLente, scan({ circ_waist: 85 }))).toEqual([]);
    expect(compareScans(semLente, semLente)).toEqual([]);
  });
});
