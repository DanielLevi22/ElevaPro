import { createBriefingService, INACTIVITY_DAYS } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As regras do briefing vivem aqui, não na tela: quem vira sinal, com que
 * urgência, e — o que mais importa — o que **não** é lido.
 */

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

const SPECIALIST = "espec-1";

interface TableData {
  student_specialists: unknown[];
  profiles: unknown[];
  student_anamnesis: unknown[];
  training_periodizations: unknown[];
  workout_sessions: unknown[];
}

let tables: TableData;
let counts: Record<string, number>;
/** Colunas pedidas por tabela — é como afirmamos que `responses` nunca é lido. */
let selected: Record<string, string>;

function makeClient() {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;

      builder.eq = vi.fn(chain);
      builder.in = vi.fn(chain);
      builder.not = vi.fn(chain);
      builder.gte = vi.fn(chain);

      // `count` chega por `head: true`; as demais consultas resolvem em `data`.
      const counting: Record<string, unknown> = {};
      counting.eq = vi.fn(() => counting);
      counting.in = vi.fn(() => counting);
      // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
      counting.then = (resolve: (v: unknown) => unknown) =>
        resolve({ count: counts[table] ?? 0, error: null });

      builder.select = vi.fn((columns: string, options?: { head?: boolean }) => {
        selected[table] = columns;
        return options?.head ? counting : builder;
      });

      // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: tables[table as keyof TableData] ?? [], error: null });

      return builder;
    },
  };
}

const service = () => createBriefingService(makeClient() as unknown as SupabaseClient);

beforeEach(() => {
  tables = {
    student_specialists: [{ student_id: "aluno-1", created_at: daysAgo(30) }],
    profiles: [{ id: "aluno-1", full_name: "João Silva", account_status: "active" }],
    student_anamnesis: [],
    training_periodizations: [],
    workout_sessions: [{ student_id: "aluno-1", completed_at: daysAgo(1) }],
  };
  counts = { workouts: 12, diet_plans: 4, ai_chat_sessions: 86 };
  selected = {};
});

describe("fetchBriefing", () => {
  it("não sinaliza nada quando o aluno treinou ontem", async () => {
    const { signals } = await service().fetchBriefing(SPECIALIST);
    expect(signals).toEqual([]);
  });

  it("sinaliza inatividade e informa os dias corretos", async () => {
    tables.workout_sessions = [{ student_id: "aluno-1", completed_at: daysAgo(9) }];

    const { signals } = await service().fetchBriefing(SPECIALIST);

    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("inactive");
    expect(signals[0].tone).toBe("danger");
    expect(signals[0].days).toBe(9);
    expect(signals[0].message).toContain("9 dias");
  });

  it("não sinaliza no dia anterior ao limite", async () => {
    tables.workout_sessions = [
      { student_id: "aluno-1", completed_at: daysAgo(INACTIVITY_DAYS - 1) },
    ];
    const { signals } = await service().fetchBriefing(SPECIALIST);
    expect(signals).toEqual([]);
  });

  it("trata aluno sem nenhuma sessão na janela como inativo, sem número inventado", async () => {
    tables.workout_sessions = [];

    const { signals } = await service().fetchBriefing(SPECIALIST);

    expect(signals[0].kind).toBe("inactive");
    expect(signals[0].message).toContain("dois meses");
  });

  // Um convidado nunca entrou, então não tem como estar treinando: marcá-lo
  // como inativo seria ruído em cima de quem já está sinalizado por outro motivo.
  it("sinaliza convite pendente em vez de inatividade", async () => {
    tables.profiles = [{ id: "aluno-1", full_name: "Marcos", account_status: "invited" }];
    tables.student_specialists = [{ student_id: "aluno-1", created_at: daysAgo(4) }];
    tables.workout_sessions = [];

    const { signals } = await service().fetchBriefing(SPECIALIST);

    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("pending_invite");
    expect(signals[0].message).toBe("Convite pendente há 4 dias.");
  });

  it("ignora convite recente", async () => {
    tables.profiles = [{ id: "aluno-1", full_name: "Marcos", account_status: "invited" }];
    tables.student_specialists = [{ student_id: "aluno-1", created_at: daysAgo(1) }];
    tables.workout_sessions = [];

    const { signals } = await service().fetchBriefing(SPECIALIST);
    expect(signals).toEqual([]);
  });

  it("sinaliza anamnese concluída sem periodização ativa", async () => {
    tables.student_anamnesis = [{ student_id: "aluno-1", completed_at: daysAgo(2) }];

    const { signals } = await service().fetchBriefing(SPECIALIST);

    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("anamnesis_ready");
    expect(signals[0].tone).toBe("success");
  });

  it("não sinaliza anamnese quando já existe periodização ativa", async () => {
    tables.student_anamnesis = [{ student_id: "aluno-1", completed_at: daysAgo(2) }];
    tables.training_periodizations = [{ student_id: "aluno-1" }];

    const { signals } = await service().fetchBriefing(SPECIALIST);
    expect(signals).toEqual([]);
  });

  it("ordena por urgência e, dentro do tipo, por quem espera há mais tempo", async () => {
    tables.student_specialists = [
      { student_id: "inativo-curto", created_at: daysAgo(30) },
      { student_id: "convidado", created_at: daysAgo(10) },
      { student_id: "inativo-longo", created_at: daysAgo(30) },
      { student_id: "pronto", created_at: daysAgo(30) },
    ];
    tables.profiles = [
      { id: "inativo-curto", full_name: "Curto", account_status: "active" },
      { id: "convidado", full_name: "Convidado", account_status: "invited" },
      { id: "inativo-longo", full_name: "Longo", account_status: "active" },
      { id: "pronto", full_name: "Pronto", account_status: "active" },
    ];
    tables.workout_sessions = [
      { student_id: "inativo-curto", completed_at: daysAgo(8) },
      { student_id: "inativo-longo", completed_at: daysAgo(20) },
      { student_id: "pronto", completed_at: daysAgo(1) },
    ];
    tables.student_anamnesis = [{ student_id: "pronto", completed_at: daysAgo(3) }];

    const { signals } = await service().fetchBriefing(SPECIALIST);

    expect(signals.map((s) => s.studentName)).toEqual(["Longo", "Curto", "Convidado", "Pronto"]);
  });

  it("devolve os números do rodapé", async () => {
    const { stats } = await service().fetchBriefing(SPECIALIST);

    expect(stats).toEqual({
      activeStudents: 1,
      workoutTemplates: 12,
      activeDietPlans: 4,
      aiSessions: 86,
    });
  });

  it("sai cedo, sem consultar nada, quando o especialista não tem aluno", async () => {
    tables.student_specialists = [];

    const { signals, stats } = await service().fetchBriefing(SPECIALIST);

    expect(signals).toEqual([]);
    expect(stats.activeStudents).toBe(0);
    expect(selected.workout_sessions).toBeUndefined();
  });

  // O parecer LGPD do PRD depende disto: o briefing lê a data, nunca o conteúdo.
  it("nunca lê o conteúdo da anamnese nem carga de treino", async () => {
    tables.student_anamnesis = [{ student_id: "aluno-1", completed_at: daysAgo(2) }];

    await service().fetchBriefing(SPECIALIST);

    expect(selected.student_anamnesis).toBe("student_id, completed_at");
    expect(selected.student_anamnesis).not.toContain("responses");
    expect(selected.workout_sessions).toBe("student_id, completed_at");
    expect(selected.profiles).not.toContain("email");
  });

  // Critério de pronto do PRD. A RLS já barra isto no banco (0016/0017), mas o
  // serviço não pode depender só dela: se um dia rodar com service_role, a
  // única barreira é esta lista.
  it("não inclui aluno fora dos vínculos, mesmo que ele venha nas outras tabelas", async () => {
    tables.student_specialists = [{ student_id: "meu-aluno", created_at: daysAgo(30) }];
    tables.profiles = [
      { id: "meu-aluno", full_name: "Meu Aluno", account_status: "active" },
      { id: "aluno-de-outro", full_name: "Aluno de Outro", account_status: "active" },
    ];
    tables.workout_sessions = [
      { student_id: "meu-aluno", completed_at: daysAgo(30) },
      { student_id: "aluno-de-outro", completed_at: daysAgo(45) },
    ];
    tables.student_anamnesis = [{ student_id: "aluno-de-outro", completed_at: daysAgo(2) }];

    const { signals, stats } = await service().fetchBriefing(SPECIALIST);

    expect(signals.map((s) => s.studentName)).toEqual(["Meu Aluno"]);
    expect(stats.activeStudents).toBe(1);
  });

  it("filtra os vínculos pelo especialista e só os ativos", async () => {
    const eqCalls: [string, unknown][] = [];
    const client = {
      from: (table: string) => {
        const builder: Record<string, unknown> = {};
        const chain = () => builder;
        builder.select = vi.fn(chain);
        builder.in = vi.fn(chain);
        builder.not = vi.fn(chain);
        builder.gte = vi.fn(chain);
        builder.eq = vi.fn((column: string, value: unknown) => {
          if (table === "student_specialists") eqCalls.push([column, value]);
          return builder;
        });
        // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
        builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
        return builder;
      },
    };

    await createBriefingService(client as unknown as SupabaseClient).fetchBriefing(SPECIALIST);

    expect(eqCalls).toContainEqual(["specialist_id", SPECIALIST]);
    expect(eqCalls).toContainEqual(["status", "active"]);
  });

  it("usa o fallback de nome quando o perfil está sem full_name", async () => {
    tables.profiles = [{ id: "aluno-1", full_name: null, account_status: "active" }];
    tables.workout_sessions = [];

    const { signals } = await service().fetchBriefing(SPECIALIST);
    expect(signals[0].studentName).toBe("Aluno");
  });
});
