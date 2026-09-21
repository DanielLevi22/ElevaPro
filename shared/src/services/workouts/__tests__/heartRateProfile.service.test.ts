import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createHeartRateProfileService } from "../heartRateProfile.service";

const TODAY = new Date("2026-09-14T12:00:00Z");

describe("heartRateProfileService", () => {
  it("estima a fc máxima pela idade declarada e os anos desde a anamnese", async () => {
    const { supabase } = criarSupabaseFake({
      data: { age: 30, medications: "Não", completed_at: "2023-09-10T12:00:00Z" },
    });

    const profile = await createHeartRateProfileService(supabase).fetchProfile("aluno-1", TODAY);

    expect(profile).toEqual({ maxHeartRate: 187, declaresMedication: false });
  });

  it("lê a idade e a medicação embrulhadas como o mobile grava", async () => {
    const { supabase } = criarSupabaseFake({
      data: {
        age: { questionId: "age", value: "40" },
        medications: { questionId: "medications", value: "Atenolol" },
        completed_at: "2026-09-14T12:00:00Z",
      },
    });

    const profile = await createHeartRateProfileService(supabase).fetchProfile("aluno-1", TODAY);

    expect(profile).toEqual({ maxHeartRate: 180, declaresMedication: true });
  });

  it("sem anamnese, não há fc máxima nem medicação declarada", async () => {
    const { supabase } = criarSupabaseFake({ data: null });

    const profile = await createHeartRateProfileService(supabase).fetchProfile("aluno-1", TODAY);

    expect(profile).toEqual({ maxHeartRate: null, declaresMedication: false });
  });

  // LGPD, Art. 6°, III. A anamnese guarda lesões, cirurgias, condições médicas e o
  // histórico familiar. As zonas precisam só da idade, e o aviso só de saber se há
  // medicação: pedir `responses` inteiro traria ao aparelho todo o resto sem uso.
  it("pede da anamnese só a idade e a medicação, nunca as respostas inteiras", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await createHeartRateProfileService(supabase).fetchProfile("aluno-1", TODAY);

    const select = chamadas[0].select ?? "";
    const columns = select.split(",").map((column) => column.trim());
    const whole = columns.filter((column) => column === "*" || /(^|:)responses$/.test(column));
    if (whole.length > 0) {
      throw new Error(`ANAMNESE INTEIRA LIDA: o select pediu ${select}`);
    }
    expect(chamadas[0].tabela).toBe("student_anamnesis");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
  });
});
