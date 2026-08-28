import { describe, expect, it } from "vitest";
import { createGamificationService } from "../gamification.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("gamificationService — ranking", () => {
  // O ranking soma várias linhas de `ranking_scores` por aluno (uma por
  // semana). Somar errado não quebra nada visivelmente: a tela mostra uma
  // ordem plausível e errada.
  it("soma os pontos do mesmo aluno em linhas diferentes", async () => {
    const { supabase } = criarSupabaseFake([
      {
        data: [
          { student_id: "a", points: 30 },
          { student_id: "b", points: 50 },
          { student_id: "a", points: 45 },
        ],
      },
      {
        data: [
          { id: "a", full_name: "Ana", avatar_url: null },
          { id: "b", full_name: "Bruno", avatar_url: null },
        ],
      },
    ]);

    const ranking = await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "global",
    );

    expect(ranking.map((e) => [e.name, e.points])).toEqual([
      ["Ana", 75],
      ["Bruno", 50],
    ]);
  });

  it("ordena por pontos e numera o rank a partir de 1", async () => {
    const { supabase } = criarSupabaseFake([
      {
        data: [
          { student_id: "a", points: 10 },
          { student_id: "b", points: 90 },
          { student_id: "c", points: 50 },
        ],
      },
      {
        data: [
          { id: "a", full_name: "Ana", avatar_url: null },
          { id: "b", full_name: "Bruno", avatar_url: null },
          { id: "c", full_name: "Caio", avatar_url: null },
        ],
      },
    ]);

    const ranking = await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "global",
    );

    expect(ranking.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(ranking[0].name).toBe("Bruno");
  });

  // `full_name` é nulável no banco — o perfil nasce no signup sem nome.
  it("mostra 'Aluno' quando o perfil ainda não tem nome", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ student_id: "a", points: 10 }] },
      { data: [{ id: "a", full_name: null, avatar_url: null }] },
    ]);

    const ranking = await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "global",
    );
    expect(ranking[0].name).toBe("Aluno");
  });

  it("não quebra quando o perfil do aluno pontuado não vem", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ student_id: "fantasma", points: 10 }] },
      { data: [] },
    ]);

    const ranking = await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "global",
    );
    expect(ranking).toEqual([
      { student_id: "fantasma", name: "Aluno", points: 10, avatar_url: undefined, rank: 1 },
    ]);
  });

  it("devolve vazio sem pontuação, sem consultar perfis", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    expect(
      await createGamificationService(supabase).fetchLeaderboard("2026-08-01", "global"),
    ).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  // No escopo "meus alunos" a lista sai do vínculo, não da pontuação: aluno
  // vinculado que ainda não pontuou precisa aparecer com zero, e não sumir.
  it("inclui aluno vinculado sem pontuação, com zero", async () => {
    const { supabase } = criarSupabaseFake([
      {
        data: [
          { student_id: "a", student: { id: "a", full_name: "Ana", avatar_url: null } },
          { student_id: "b", student: { id: "b", full_name: "Bruno", avatar_url: null } },
        ],
      },
      { data: [{ student_id: "a", points: 40 }] },
    ]);

    const ranking = await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "my_students",
      "esp-1",
    );

    expect(ranking).toEqual([
      { student_id: "a", name: "Ana", points: 40, avatar_url: undefined, rank: 1 },
      { student_id: "b", name: "Bruno", points: 0, avatar_url: undefined, rank: 2 },
    ]);
  });

  // Só vínculo `active`: especialista que encerrou o acompanhamento não pode
  // continuar vendo a pontuação do ex-aluno.
  it("filtra por vínculo ativo do especialista", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: [] }]);
    await createGamificationService(supabase).fetchLeaderboard(
      "2026-08-01",
      "my_students",
      "esp-1",
    );

    expect(chamadas[0].tabela).toBe("student_specialists");
    expect(chamadas[0].filtros).toEqual({ specialist_id: "esp-1", status: "active" });
  });

  it("sem alunos vinculados, não consulta pontuação", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: [] }]);
    expect(
      await createGamificationService(supabase).fetchLeaderboard(
        "2026-08-01",
        "my_students",
        "esp-1",
      ),
    ).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  it("propaga erro em vez de devolver ranking vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(
      createGamificationService(supabase).fetchLeaderboard("2026-08-01", "global"),
    ).rejects.toEqual({ message: "42501" });
  });
});

describe("gamificationService — streak freeze", () => {
  // O congelamento é um recurso finito. Gastar sem verificar deixaria o saldo
  // negativo, e o aluno protegeria a sequência para sempre.
  it("recusa quando não há congelamento disponível", async () => {
    const { supabase } = criarSupabaseFake({ data: { id: "s1", freeze_available: 0 } });
    await expect(createGamificationService(supabase).useStreakFreeze("aluno-1")).rejects.toThrow(
      "No freeze available",
    );
  });

  it("desconta um e registra a data ao usar", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "s1", freeze_available: 2 } },
      {},
    ]);
    await createGamificationService(supabase).useStreakFreeze("aluno-1");

    const payload = chamadas[1].payload as Record<string, unknown>;
    expect(payload.freeze_available).toBe(1);
    expect(payload.last_freeze_date).toEqual(expect.any(String));
    expect(chamadas[1].filtros).toEqual({ id: "s1" });
  });
});

describe("gamificationService — metas diárias", () => {
  // `ignoreDuplicates` é o que torna a chamada segura de repetir: a tela chama
  // isto a cada abertura, e sem ele a meta do dia seria recriada e zeraria o
  // progresso já registrado.
  it("cria a meta do dia sem sobrescrever a existente", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createGamificationService(supabase).calculateDailyGoals("aluno-1", "2026-08-28");

    expect(chamadas[0].metodos.find((m) => m.nome === "upsert")?.args[1]).toEqual({
      onConflict: "student_id,date",
      ignoreDuplicates: true,
    });
  });

  it("filtra a meta por aluno quando o id é informado", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });
    await createGamificationService(supabase).getDailyGoal("2026-08-28", "aluno-9");
    expect(chamadas[0].filtros).toEqual({ date: "2026-08-28", student_id: "aluno-9" });
  });
});
