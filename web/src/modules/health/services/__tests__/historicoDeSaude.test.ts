import type { HealthDailyMetric } from "@elevapro/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarSupabaseFake } from "../../../../../../shared/src/services/__tests__/supabaseFake";

const { clienteFake } = vi.hoisted(() => ({
  clienteFake: { atual: null as ReturnType<typeof criarSupabaseFake> | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => clienteFake.atual?.supabase,
}));

const { carregarHistoricoDeSaude } = await import("../historicoDeSaude");

/** Dia mínimo: só as colunas que o resumo lê. */
function dia(
  date: string,
  campos: Partial<HealthDailyMetric> = {},
): Pick<HealthDailyMetric, "date" | "steps" | "sleep_minutes" | "resting_heart_rate"> {
  return {
    date,
    steps: 8000,
    sleep_minutes: 420,
    resting_heart_rate: 60,
    ...campos,
  };
}

function comDias(dias: unknown[]) {
  clienteFake.atual = criarSupabaseFake({ data: dias });
}

beforeEach(() => {
  clienteFake.atual = null;
});

describe("carregarHistoricoDeSaude", () => {
  // A média que o especialista lê não pode conter o dia comparado: incluí-lo
  // achata justamente o desvio que ele veio ver. Com 480 e três dias de 420, a
  // resposta certa é +60 — não +45, que é o que sai quando o próprio 480 entra
  // na conta.
  it("compara o dia mais recente com a média dos anteriores, sem incluí-lo", async () => {
    comDias([
      dia("2026-09-04", { sleep_minutes: 480 }),
      dia("2026-09-03", { sleep_minutes: 420 }),
      dia("2026-09-02", { sleep_minutes: 420 }),
      dia("2026-09-01", { sleep_minutes: 420 }),
    ]);

    const { sono } = await carregarHistoricoDeSaude("aluno-1");

    expect(sono.atual).toBe(480);
    expect(sono.media).toBe(420);
    expect(sono.variacao).toBe(60);
  });

  // Com dois dias de base, "+0 em relação à média" é um número inventado com
  // cara de medição. A tela precisa poder dizer "sem base ainda", e só
  // consegue se o serviço devolver nulo em vez de um número qualquer.
  it("não inventa média com menos de três dias de base", async () => {
    comDias([dia("2026-09-04"), dia("2026-09-03"), dia("2026-09-02")]);

    const { sono } = await carregarHistoricoDeSaude("aluno-1");

    expect(sono.atual).toBe(420);
    expect(sono.media).toBeNull();
    expect(sono.variacao).toBeNull();
  });

  // Dia sem leitura é ausência, não zero — a `0046` guarda NULL de propósito.
  // Se um NULL entrasse na média como zero, uma noite não medida derrubaria a
  // linha de base e faria o especialista ver queda de sono onde não houve.
  it("ignora dias sem leitura ao montar a base", async () => {
    comDias([
      dia("2026-09-04", { sleep_minutes: 420 }),
      dia("2026-09-03", { sleep_minutes: null }),
      dia("2026-09-02", { sleep_minutes: 400 }),
      dia("2026-09-01", { sleep_minutes: 400 }),
      dia("2026-08-31", { sleep_minutes: 400 }),
    ]);

    const { sono } = await carregarHistoricoDeSaude("aluno-1");

    expect(sono.media).toBe(400);
    expect(sono.variacao).toBe(20);
  });

  it("devolve tudo nulo quando o dia mais recente não tem leitura", async () => {
    comDias([
      dia("2026-09-04", { resting_heart_rate: null }),
      dia("2026-09-03", { resting_heart_rate: 60 }),
      dia("2026-09-02", { resting_heart_rate: 60 }),
      dia("2026-09-01", { resting_heart_rate: 60 }),
    ]);

    const { frequenciaDeRepouso } = await carregarHistoricoDeSaude("aluno-1");

    expect(frequenciaDeRepouso.atual).toBeNull();
    expect(frequenciaDeRepouso.variacao).toBeNull();
  });

  // Aluno que revogou o consentimento volta lista vazia pela RLS da `0043`, e
  // este caminho precisa devolver estado vazio em vez de quebrar a página do
  // especialista.
  it("devolve estado vazio quando a RLS não entrega nada", async () => {
    comDias([]);

    const historico = await carregarHistoricoDeSaude("aluno-1");

    expect(historico.dias).toEqual([]);
    expect(historico.sono.atual).toBeNull();
    expect(historico.passos.media).toBeNull();
  });

  it("consulta a tabela certa, do aluno certo", async () => {
    comDias([]);

    await carregarHistoricoDeSaude("aluno-7");

    const chamada = clienteFake.atual?.chamadas[0];
    expect(chamada?.tabela).toBe("health_daily_metrics");
    expect(chamada?.filtros).toMatchObject({ student_id: "aluno-7" });
  });
});
