import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { checkInSentence, fetchCheckInActivity } from "../checkInActivity";

describe("fetchCheckInActivity", () => {
  it("devolve a resposta do registro já em frase, sem peso nem nota", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: [
        { id: "c1", student_id: "a1", created_at: "2026-10-12T10:00:00Z", logging: "partial" },
        { id: "c2", student_id: "a2", created_at: "2026-10-11T10:00:00Z", logging: "not_followed" },
      ],
    });

    const activity = await fetchCheckInActivity(supabase, ["a1", "a2"], 10);

    expect(activity.map((item) => checkInSentence(item.loggingLabel))).toEqual([
      "Fez o check-in da semana: registrou parte",
      "Fez o check-in da semana: não seguiu o plano",
    ]);
    // Só a resposta do registro: nem o peso nem a medida ligada ao check-in.
    expect(chamadas[0].select).toBe("id, student_id, created_at, logging");
  });

  it("propaga o erro da RLS em vez de mostrar um painel vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(fetchCheckInActivity(supabase, ["a1"], 5)).rejects.toEqual({ message: "42501" });
  });
});
