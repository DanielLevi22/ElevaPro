import { describe, expect, it } from "vitest";
import { parseMeasurementForm } from "../measurementForm";

describe("parseMeasurementForm", () => {
  it("converte o que foi digitado, com vírgula, e deixa de fora o campo vazio", () => {
    expect(
      parseMeasurementForm({
        weight_kg: "78,4",
        height_cm: "180",
        circ_waist: "81,6",
        circ_hip: "",
      }),
    ).toEqual({ ok: true, input: { weight_kg: 78.4, height_cm: 180, circ_waist: 81.6 } });
  });

  // Peso e altura são a Escala do Body scan: sem os dois a avaliação não serve de fonte (0037).
  it("recusa sem peso ou sem altura, dizendo qual", () => {
    expect(parseMeasurementForm({ height_cm: "180" })).toEqual({
      ok: false,
      field: "weight_kg",
      reason: "required",
    });
    expect(parseMeasurementForm({ weight_kg: "78" })).toEqual({
      ok: false,
      field: "height_cm",
      reason: "required",
    });
  });

  // Fora de faixa é digitação errada: gravar 8200 cm de cintura estraga a série inteira.
  it("recusa valor fora da faixa plausível, dizendo qual", () => {
    expect(parseMeasurementForm({ weight_kg: "78", height_cm: "180", circ_waist: "8200" })).toEqual(
      {
        ok: false,
        field: "circ_waist",
        reason: "range",
      },
    );
    expect(
      parseMeasurementForm({ weight_kg: "78", height_cm: "180", body_fat_pct: "90" }),
    ).toMatchObject({
      field: "body_fat_pct",
    });
  });

  it("aceita a altura em metro, como a anamnese", () => {
    expect(parseMeasurementForm({ weight_kg: "78", height_cm: "1,80" })).toMatchObject({
      input: { height_cm: 180 },
    });
  });
});
