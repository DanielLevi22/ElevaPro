import { describe, expect, it } from "vitest";
import { createGamificationService } from "../gamification.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("gamificationService — ranking", () => {
  // O placar sai da RPC, que decide a semana, o grupo e o nome abreviado. O
  // serviço não monta ranking no cliente: a RLS não deixa ler o perfil alheio.
  it("pede o placar do escopo à get_leaderboard", async () => {
    const { supabase, rpcs, chamadas } = criarSupabaseFake({ data: [] });
    await createGamificationService(supabase).fetchLeaderboard("my_students");

    expect(rpcs).toEqual([{ nome: "get_leaderboard", args: [{ p_scope: "my_students" }] }]);
    expect(chamadas).toHaveLength(0);
  });

  it("devolve as linhas na ordem da RPC, com a posição anterior", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        {
          student_id: "a",
          display_name: "Ana C.",
          points: 300,
          rank: 1,
          previous_rank: 2,
          is_me: false,
        },
        {
          student_id: "b",
          display_name: "Bruno Lima",
          points: 200,
          rank: 2,
          previous_rank: null,
          is_me: true,
        },
      ],
    });

    const ranking = await createGamificationService(supabase).fetchLeaderboard("global");

    expect(ranking).toEqual([
      { studentId: "a", displayName: "Ana C.", points: 300, rank: 1, previousRank: 2, isMe: false },
      {
        studentId: "b",
        displayName: "Bruno Lima",
        points: 200,
        rank: 2,
        previousRank: null,
        isMe: true,
      },
    ]);
  });

  it("devolve vazio quando ninguém pontuou", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createGamificationService(supabase).fetchLeaderboard("global")).toEqual([]);
  });

  // A tela antiga engolia o erro e abria vazia: parecia semana sem pontos, e
  // era a tabela que não existia.
  it("propaga o erro em vez de devolver placar vazio", async () => {
    const { supabase } = criarSupabaseFake({
      error: { code: "42501", message: "ranking_consent_required" },
    });
    await expect(createGamificationService(supabase).fetchLeaderboard("global")).rejects.toEqual({
      code: "42501",
      message: "ranking_consent_required",
    });
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
