import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createRestService } from "../rest.service";

const rest = { id: "r1", starts_on: "2026-10-14", planned_until: "2026-10-21", ended_on: null };

describe("createRestService", () => {
  it("lê as pausas recentes da pessoa, só as datas, da mais nova para a mais antiga", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [rest] });

    expect(await createRestService(supabase).recent("aluno-1")).toEqual([rest]);
    expect(chamadas[0].tabela).toBe("rest_periods");
    // A pausa não guarda motivo (0092): a leitura pede só as datas.
    expect(chamadas[0].select).toBe("id, starts_on, planned_until, ended_on");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
  });

  it("pausar e voltar passam pelas funções, que pegam o dia no fuso do Brasil", async () => {
    const { supabase, rpcs } = criarSupabaseFake({ data: rest });
    const service = createRestService(supabase);

    await service.start("2026-10-21");
    await service.start(null);
    await service.end();

    expect(rpcs).toEqual([
      { nome: "start_rest", args: [{ p_until: "2026-10-21" }] },
      { nome: "start_rest", args: [{ p_until: null }] },
      { nome: "end_rest", args: [] },
    ]);
  });

  it("propaga a recusa do banco em vez de fingir que pausou", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "duplicate key" } });
    await expect(createRestService(supabase).start(null)).rejects.toEqual({
      message: "duplicate key",
    });
  });
});
