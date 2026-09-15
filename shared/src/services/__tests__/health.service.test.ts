import { describe, expect, it } from "vitest";
import { createHealthService, POLICY_VERSION } from "../health.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("getConsentStatus", () => {
  // O health check diz ao aluno em que pé está o aceite: aceito (com a data), pendente
  // de uma versão nova, retirado ou nunca dado. Os quatro pedem ação diferente.
  it("aceito na versão vigente, com a data", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-09-14T10:00:00Z", revoked_at: null, policy_version: POLICY_VERSION },
    });
    expect(await createHealthService(supabase).getConsentStatus("aluno-1")).toEqual({
      state: "granted",
      givenAt: "2026-09-14T10:00:00Z",
      policyVersion: POLICY_VERSION,
    });
  });

  it("pendente quando o aceite é de outra versão", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-08-01T10:00:00Z", revoked_at: null, policy_version: "1.6" },
    });
    expect((await createHealthService(supabase).getConsentStatus("aluno-1")).state).toBe(
      "outdated",
    );
  });

  it("retirado vale mais que a versão", async () => {
    const { supabase } = criarSupabaseFake({
      data: {
        given_at: "2026-08-01T10:00:00Z",
        revoked_at: "2026-09-01T10:00:00Z",
        policy_version: POLICY_VERSION,
      },
    });
    expect((await createHealthService(supabase).getConsentStatus("aluno-1")).state).toBe("revoked");
  });

  it("nunca dado, sem data nem versão", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createHealthService(supabase).getConsentStatus("aluno-1")).toEqual({
      state: "missing",
      givenAt: null,
      policyVersion: null,
    });
  });
});

describe("healthService — consentimento", () => {
  // A base legal do Art. 11 exige consentimento além da tutela da saúde: sem
  // registro, o dado pode aparecer na tela mas não pode ser persistido. Um
  // falso-positivo aqui é coleta de dado de saúde sem base legal.
  it("nega quando não há registro de consentimento", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  it("concede quando foi dado, não revogado e na versão vigente", async () => {
    const { supabase } = criarSupabaseFake({
      data: {
        given_at: "2026-08-01T10:00:00Z",
        revoked_at: null,
        policy_version: POLICY_VERSION,
      },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(true);
  });

  // O reconsentimento inteiro depende desta asserção. Enquanto a consulta lia
  // só `given_at` e `revoked_at`, subir POLICY_VERSION não alcançava ninguém:
  // quem aceitou a 1.0 seguia como consentido para sempre, sob um texto que já
  // não descrevia o tratamento. Consentimento informado (Art. 9°) é sobre o
  // texto que a pessoa leu.
  it("nega quando o consentimento é de uma versão anterior da política", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-08-01T10:00:00Z", revoked_at: null, policy_version: "1.0" },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  // Cliente desatualizado não tem como afirmar o que a política nova diz, então
  // versão posterior também não vale — a comparação é de igualdade, não de ordem.
  it("nega quando o consentimento é de uma versão posterior à conhecida", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: "2026-08-01T10:00:00Z", revoked_at: null, policy_version: "99.0" },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  // Revogar é prospectivo: interrompe a coleta sem apagar o histórico. Se esta
  // asserção cair, o app volta a coletar de quem pediu para parar.
  it("nega depois de revogado, mesmo tendo sido dado antes", async () => {
    const { supabase } = criarSupabaseFake({
      data: {
        given_at: "2026-08-01T10:00:00Z",
        revoked_at: "2026-08-20T10:00:00Z",
        policy_version: POLICY_VERSION,
      },
    });
    expect(await createHealthService(supabase).hasCollectionConsent("aluno-1")).toBe(false);
  });

  it("nega quando o registro existe sem `given_at`", async () => {
    const { supabase } = criarSupabaseFake({
      data: { given_at: null, revoked_at: null, policy_version: POLICY_VERSION },
    });
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
    // Grava a versão vigente, e não a que o aluno tinha antes: é isso que
    // encerra o pedido de reconsentimento em vez de repeti-lo a cada abertura.
    expect(payload.policy_version).toBe(POLICY_VERSION);
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

  // A leitura de cada métrica falha por conta própria: o relógio dá passos e
  // não dá sono, ou o Health Connect concede uma permissão e nega outra. Se a
  // gravação parcial enviasse `null` no que não leu, cada sincronização de
  // passos apagaria o sono da noite anterior — e o dado sumiria sem erro
  // nenhum, que é a forma mais cara de perdê-lo.
  it("não apaga a métrica que esta leitura não trouxe", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).upsertDaily("aluno-1", {
      date: "2026-09-04",
      steps: 8421,
      active_calories: 512,
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty("sleep_minutes");
    expect(payload).not.toHaveProperty("resting_heart_rate");
  });

  it("grava sono e FC de repouso quando a leitura os trouxe", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).upsertDaily("aluno-1", {
      date: "2026-09-04",
      steps: 8421,
      active_calories: 512,
      sleep_minutes: 431,
      resting_heart_rate: 58,
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.sleep_minutes).toBe(431);
    expect(payload.resting_heart_rate).toBe(58);
  });

  // A nota vai com a versão da regra, sempre as duas: o CHECK da `0055` recusa uma
  // sem a outra, e um payload que mandasse só a nota derrubaria o dia inteiro.
  it("grava a prontidão com a versão da regra, e apaga as duas juntas", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    const service = createHealthService(supabase);
    await service.upsertDaily("aluno-1", {
      date: "2026-09-04",
      steps: 8421,
      active_calories: 512,
      readiness: { score: 82, version: 1 },
    });
    await service.upsertDaily("aluno-1", {
      date: "2026-09-05",
      steps: 8421,
      active_calories: 512,
      readiness: null,
    });

    expect(chamadas[0].payload).toMatchObject({ readiness_score: 82, readiness_version: 1 });
    expect(chamadas[1].payload).toMatchObject({ readiness_score: null, readiness_version: null });
  });

  it("não apaga a prontidão que esta leitura não calculou", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).upsertDaily("aluno-1", {
      date: "2026-09-04",
      steps: 8421,
      active_calories: 512,
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty("readiness_score");
    expect(payload).not.toHaveProperty("readiness_version");
  });

  // `null` explícito é o caminho de apagar de propósito, e precisa continuar
  // distinguível de "não li". Sem esta asserção, uma implementação que filtrasse
  // por `!= null` em vez de `!== undefined` passaria nos dois testes acima e
  // tornaria a eliminação impossível.
  it("aceita null explícito para apagar a métrica", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createHealthService(supabase).upsertDaily("aluno-1", {
      date: "2026-09-04",
      steps: 8421,
      active_calories: 512,
      sleep_minutes: null,
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload).toHaveProperty("sleep_minutes");
    expect(payload.sleep_minutes).toBeNull();
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
