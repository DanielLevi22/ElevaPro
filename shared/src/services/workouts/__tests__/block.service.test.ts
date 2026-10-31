import { describe, expect, it } from "vitest";
import { TRAINING_PLACES } from "../../../utils/trainingPlace";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createBlockService } from "../block.service";

const PERIODIZATION = {
  id: "per-1",
  name: "Bloco 2 · Hipertrofia",
  start_date: "2026-10-01",
  end_date: "2026-10-28",
  plans: [{ id: "plan-1" }, { id: "plan-2" }],
};

describe("activeBlock", () => {
  it("o bloco ativo do próprio Praticante, com as fases", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: PERIODIZATION },
      { data: [], count: 0 },
    ]);

    expect(await createBlockService(supabase).activeBlock("aluno-1")).toEqual({
      id: "per-1",
      name: "Bloco 2 · Hipertrofia",
      start_date: "2026-10-01",
      end_date: "2026-10-28",
      planIds: ["plan-1", "plan-2"],
    });
    // Só o plano que a pessoa aprovou: o do especialista não é bloco dela.
    expect(chamadas[0].filtros).toMatchObject({ specialist_id: null, status: "active" });
  });

  // O app não muda nada sozinho para quem tem especialista (decidido no #376):
  // a descarga, a reavaliação e o próximo bloco são dele.
  it("com especialista ativo, não há bloco próprio", async () => {
    const { supabase } = criarSupabaseFake([{ data: PERIODIZATION }, { data: [], count: 1 }]);
    if ((await createBlockService(supabase).activeBlock("aluno-1")) !== null) {
      throw new Error("BLOCO SEM ESPECIALISTA: o Aluno ganhou o ciclo automático do Praticante");
    }
  });

  it("sem periodização ativa, nulo", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { data: [], count: 0 }]);
    expect(await createBlockService(supabase).activeBlock("aluno-1")).toBeNull();
  });
});

describe("currentChoices", () => {
  it("as respostas da pessoa, com os padrões da geração para o que ela pulou", async () => {
    const respondeu = criarSupabaseFake({
      data: {
        main_goal: "Hipertrofia",
        training_days: 5,
        gym_type: TRAINING_PLACES.home,
        injuries: ["knee"],
      },
    });
    expect(await createBlockService(respondeu.supabase).currentChoices("a")).toEqual({
      goal: "Hipertrofia",
      trainingDays: 5,
      place: TRAINING_PLACES.home,
      injuries: ["knee"],
    });

    const pulou = criarSupabaseFake({ data: { main_goal: "Ficar famoso" } });
    const padrao = await createBlockService(pulou.supabase).currentChoices("a");
    expect(padrao.goal).toBeNull();
    expect(padrao.injuries).toEqual([]);
    expect(padrao.place).toBe(TRAINING_PLACES.fullGym);
  });

  it("lê da anamnese só as quatro respostas da reavaliação", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: {} });
    await createBlockService(supabase).currentChoices("a");
    expect(chamadas[0].select).toBe(
      "main_goal:responses->main_goal, training_days:responses->training_days, gym_type:responses->gym_type, injuries:responses->injuries",
    );
  });
});

describe("levelUpAvailable", () => {
  it("pergunta subir de nível só a quem está há semanas no plano e treinou o prescrito", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { persona_track: "beginner" } },
      { data: { start_date: "2026-07-01" } },
      { data: [], count: 60 },
      { data: { id: "per-1" } },
      { data: { id: "plan-1" } },
      { data: [], count: 4 },
    ]);
    expect(await createBlockService(supabase).levelUpAvailable("a", "2026-10-14")).toBe(true);
  });

  it("sem histórico suficiente, não pergunta", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { persona_track: "beginner" } },
      { data: { start_date: "2026-10-01" } },
      { data: [], count: 3 },
      { data: { id: "per-1" } },
      { data: { id: "plan-1" } },
      { data: [], count: 4 },
    ]);
    expect(await createBlockService(supabase).levelUpAvailable("a", "2026-10-14")).toBe(false);
  });
});
