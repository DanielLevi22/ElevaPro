import { describe, expect, it } from "vitest";
import { createHealthService } from "../health.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("healthService — consentimento", () => {
  // A base legal do Art. 11 exige consentimento além da tutela da saúde: sem
  // registro, o dado pode aparecer na tela mas não pode ser persistido. Um
  // falso-positivo aqui é coleta de dado de saúde sem base legal.
  it("nega quando não há registro de consentimento", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  it("concede quando foi dado e não revogado", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-08-01T10:00:00Z", revoked_at: null },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(true);
  });

  // Revogar é prospectivo: interrompe a coleta sem apagar o histórico. Se esta
  // asserção cair, o app volta a coletar de quem pediu para parar.
  it("nega depois de revogado, mesmo tendo sido dado antes", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-08-01T10:00:00Z", revoked_at: "2026-08-20T10:00:00Z" },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  it("nega quando o registro existe sem `given_at`", async () => {
    const { supabase } = criarSupabaseFake({ data: { given_at: null, revoked_at: null } });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  // Erro de consulta não pode virar `false`: "não consegui verificar" e "não
  // consentiu" levam a caminhos diferentes — o segundo oferece o fluxo de
  // consentimento, o primeiro precisa falhar visível.
  it("propaga erro de consulta em vez de responder que não consentiu", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "conexão caiu" } });
    await expect(createHealthService(supabase).hasCollectionConsent("aluno-1")).rejects.toEqual({
      message: "conexão caiu",
    });
  });

  it("consulta o consentimento certo, do aluno certo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });
    await createHealthService(supabase).hasCollectionConsent("aluno-7");

    expect(chamadas[0].tabela).toBe("student_consents");
    expect(chamadas[0].filtros).toEqual({
      student_id: "aluno-7",
      consent_type: "health_data_collection",
    });
  });

  // Reconceder limpa `revoked_at` em vez de criar linha nova: sem isso a
  // consulta por `maybeSingle` passaria a achar duas e quebrar.
  it("reativa o consentimento revogado limpando revoked_at", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).grantCollectionConsent("aluno-1");

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.revoked_at).toBeNull();
    expect(payload.given_at).toEqual(expect.any(String));
    expect(chamadas[0].metodos.find((m) => m.nome === "upsert")?.args[1]).toEqual({
      onConflict: "student_id,consent_type",
    });
  });

  it("revogar não apaga o histórico — só marca a data", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).revokeCollectionConsent("aluno-1");

    expect(chamadas[0].metodos.some((m) => m.nome === "delete")).toBe(false);
    expect(Object.keys(chamadas[0].payload as object)).toEqual(["revoked_at"]);
  });
});

describe("healthService — métricas diárias", () => {
  // O background fetch reenvia o mesmo dia várias vezes. Sem `onConflict`, cada
  // reenvio viraria uma linha e a contagem de passos inflaria sozinha.
  it("grava o dia de forma idempotente por aluno e data", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).upsertDaily("aluno-1", {
      date: "2026-08-28",
      steps: 8000,
      active_calories: 320,
    });

    expect(chamadas[0].tabela).toBe("health_daily_metrics");
    expect(chamadas[0].metodos.find((m) => m.nome === "upsert")?.args[1]).toEqual({
      onConflict: "student_id,date",
    });
  });

  // Regressão do DT-24. `health_daily_metrics` é sensível pela
  // LGPD_COMPLIANCE.md: com `select("*")`, a coluna criada amanhã sai do banco
  // no dia em que nasce, para toda camada que já consultava.
  it("pede colunas nomeadas, nunca `*`", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    const health = createHealthService(supabase);

    await health.getRange("aluno-1", "2026-08-01", "2026-08-31");
    await health.getDay("aluno-1", "2026-08-28");

    for (const chamada of chamadas) {
      expect(chamada.select).not.toBe("*");
      expect(chamada.select).toContain("steps");
    }
  });

  it("devolve lista vazia quando não há dado, sem quebrar", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createHealthService(supabase).getRange("aluno-1", "a", "b")).toEqual([]);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42703" } });
    await expect(createHealthService(supabase).getRange("aluno-1", "a", "b")).rejects.toEqual({
      message: "42703",
    });
  });
});
