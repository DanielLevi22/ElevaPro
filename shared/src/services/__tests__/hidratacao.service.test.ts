import { describe, expect, it } from "vitest";
import { createHidratacao } from "../hidratacao.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("hidratação — gravar a água do dia", () => {
  // Um total por dia, e não um registro por copo: a série revelaria a rotina
  // (issue #298). Tocar num copo reescreve o total de hoje, e por isso é upsert
  // no par (aluno, dia), e não insert.
  it("grava o total do dia por upsert no par aluno e dia", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHidratacao(supabase).gravarDia("aluno-1", "2026-09-13", 1500);

    expect(chamadas[0].tabela).toBe("hydration_daily");
    expect(chamadas[0].payload).toMatchObject({
      student_id: "aluno-1",
      date: "2026-09-13",
      water_ml: 1500,
    });
    expect(chamadas[0].metodos).toContainEqual({
      nome: "upsert",
      args: [expect.anything(), { onConflict: "student_id,date" }],
    });
  });

  // O CHECK do banco barra acima de 10 L; recusar antes evita a ida e o erro
  // genérico, e diz o valor e o formato esperado.
  it("recusa total fora da faixa, dizendo o valor e a faixa", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await expect(
      createHidratacao(supabase).gravarDia("aluno-1", "2026-09-13", 12000),
    ).rejects.toThrow(/12000.*0 e 10000/);
    expect(chamadas).toHaveLength(0);
  });

  it("propaga o erro do banco — sem consentimento, a RLS recusa", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(
      createHidratacao(supabase).gravarDia("aluno-1", "2026-09-13", 500),
    ).rejects.toEqual({ message: "42501" });
  });
});

describe("hidratação — ler", () => {
  it("o dia sem registro vale zero", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });
    const ml = await createHidratacao(supabase).lerDia("aluno-1", "2026-09-13");

    expect(ml).toBe(0);
    expect(chamadas[0].select).toBe("water_ml");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", date: "2026-09-13" });
  });

  it("a semana lê só dia e total, no intervalo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: [{ date: "2026-09-07", water_ml: 2000 }],
    });
    const dias = await createHidratacao(supabase).lerIntervalo(
      "aluno-1",
      "2026-09-07",
      "2026-09-13",
    );

    expect(dias).toEqual([{ date: "2026-09-07", water_ml: 2000 }]);
    expect(chamadas[0].select).toBe("date, water_ml");
    expect(chamadas[0].metodos).toContainEqual({ nome: "eq", args: ["student_id", "aluno-1"] });
    expect(chamadas[0].metodos).toContainEqual({ nome: "gte", args: ["date", "2026-09-07"] });
    expect(chamadas[0].metodos).toContainEqual({ nome: "lte", args: ["date", "2026-09-13"] });
  });
});
