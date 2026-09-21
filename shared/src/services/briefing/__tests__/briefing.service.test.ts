import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createBriefingService, INACTIVITY_DAYS, PENDING_INVITE_DAYS } from "../briefing.service";

/** Data ISO com `dias` de idade, para montar cenários sem depender de hoje. */
function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

/**
 * As sete consultas do `Promise.all` na ordem em que `fetchBriefing` as monta.
 * Nomear cada uma evita o teste virar um array de objetos anônimos onde trocar
 * duas posições passa despercebido.
 */
function respostas(opcoes: {
  vinculos: unknown[];
  perfis?: unknown[];
  anamneses?: unknown[];
  periodizacoes?: unknown[];
  sessoes?: unknown[];
  totalTreinos?: number;
  totalDietas?: number;
  totalSessoesIa?: number;
}) {
  return [
    { data: opcoes.vinculos },
    { data: opcoes.perfis ?? [] },
    { data: opcoes.anamneses ?? [] },
    { data: opcoes.periodizacoes ?? [] },
    { data: opcoes.sessoes ?? [] },
    { data: [], count: opcoes.totalTreinos ?? 0 },
    { data: [], count: opcoes.totalDietas ?? 0 },
    { data: [], count: opcoes.totalSessoesIa ?? 0 },
  ];
}

describe("briefingService — sem alunos", () => {
  // Sem vínculo ativo não há o que resumir, e as sete consultas seguintes
  // receberiam `in("id", [])` — uma condição vazia que não filtra nada.
  it("devolve briefing vazio sem disparar as demais consultas", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    const briefing = await createBriefingService(supabase).fetchBriefing("esp-1");

    expect(briefing.signals).toEqual([]);
    expect(briefing.stats.activeStudents).toBe(0);
    expect(chamadas).toHaveLength(1);
  });

  it("propaga erro do vínculo em vez de devolver briefing vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createBriefingService(supabase).fetchBriefing("esp-1")).rejects.toEqual({
      message: "42501",
    });
  });

  it("busca apenas vínculos ativos do especialista", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(chamadas[0].filtros).toEqual({ specialist_id: "esp-1", status: "active" });
  });
});

describe("briefingService — sinais", () => {
  it("marca convite pendente quando o aluno nunca entrou", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(PENDING_INVITE_DAYS + 2) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "invited" }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("pending_invite");
    expect(signals[0].studentName).toBe("Ana");
  });

  // Aluno que nunca entrou não tem como estar treinando: sinalizar inatividade
  // nele seria ruído em cima de um problema diferente.
  it("não acusa inatividade de quem ainda não aceitou o convite", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(PENDING_INVITE_DAYS + 60) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "invited" }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals.map((s) => s.kind)).toEqual(["pending_invite"]);
  });

  it("não sinaliza convite ainda recente", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(1) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "invited" }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals).toEqual([]);
  });

  it("acusa inatividade de aluno ativo sem treino recente", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
        sessoes: [{ student_id: "a", completed_at: diasAtras(INACTIVITY_DAYS + 3) }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals[0].kind).toBe("inactive");
  });

  it("não acusa quem treinou dentro do prazo", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
        sessoes: [{ student_id: "a", completed_at: diasAtras(1) }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals).toEqual([]);
  });

  // O sinal mais útil do briefing: quem respondeu a anamnese e ainda não
  // recebeu plano é exatamente o aluno esperando o especialista agir.
  it("aponta anamnese concluída sem periodização ativa", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
        anamneses: [{ student_id: "a", completed_at: diasAtras(2) }],
        sessoes: [{ student_id: "a", completed_at: diasAtras(1) }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals[0].kind).toBe("anamnesis_ready");
  });

  it("não aponta anamnese pronta se o aluno já tem plano ativo", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
        anamneses: [{ student_id: "a", completed_at: diasAtras(2) }],
        periodizacoes: [{ student_id: "a" }],
        sessoes: [{ student_id: "a", completed_at: diasAtras(1) }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals).toEqual([]);
  });

  // A ordem é o valor do briefing: o especialista lê de cima para baixo e para
  // quando acabar o tempo. Inativo vem antes de convite, que vem antes de
  // anamnese pronta.
  it("ordena por urgência e, dentro do tipo, por quem espera há mais tempo", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [
          { student_id: "a", created_at: diasAtras(90) },
          { student_id: "b", created_at: diasAtras(PENDING_INVITE_DAYS + 5) },
          { student_id: "c", created_at: diasAtras(90) },
          { student_id: "d", created_at: diasAtras(90) },
        ],
        perfis: [
          { id: "a", full_name: "Ana", account_status: "active" },
          { id: "b", full_name: "Bruno", account_status: "invited" },
          { id: "c", full_name: "Caio", account_status: "active" },
          { id: "d", full_name: "Duda", account_status: "active" },
        ],
        anamneses: [{ student_id: "d", completed_at: diasAtras(2) }],
        sessoes: [
          { student_id: "a", completed_at: diasAtras(INACTIVITY_DAYS + 1) },
          { student_id: "c", completed_at: diasAtras(INACTIVITY_DAYS + 20) },
          { student_id: "d", completed_at: diasAtras(1) },
        ],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");

    expect(signals.map((s) => s.kind)).toEqual([
      "inactive",
      "inactive",
      "pending_invite",
      "anamnesis_ready",
    ]);
    // Entre os dois inativos, Caio está parado há mais tempo.
    expect(signals[0].studentName).toBe("Caio");
  });

  it("usa 'Aluno' quando o perfil ainda não tem nome", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: null, account_status: "active" }],
      }),
    );

    const { signals } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(signals[0].studentName).toBe("Aluno");
  });
});

describe("briefingService — anamnese", () => {
  // `student_anamnesis` é sensível pela LGPD_COMPLIANCE.md, e `responses` é o
  // conteúdo inteiro dela. O briefing só precisa saber SE foi concluída.
  it("nunca carrega o conteúdo da anamnese, só a data de conclusão", async () => {
    const { supabase, chamadas } = criarSupabaseFake(
      respostas({
        vinculos: [{ student_id: "a", created_at: diasAtras(90) }],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
      }),
    );

    await createBriefingService(supabase).fetchBriefing("esp-1");

    const anamnese = chamadas.find((c) => c.tabela === "student_anamnesis");
    expect(anamnese?.select).toBe("student_id, completed_at");
    expect(anamnese?.select).not.toContain("responses");
  });
});

describe("briefingService — números do topo", () => {
  it("conta alunos, treinos, dietas e sessões de IA", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [
          { student_id: "a", created_at: diasAtras(90) },
          { student_id: "b", created_at: diasAtras(90) },
        ],
        perfis: [
          { id: "a", full_name: "Ana", account_status: "active" },
          { id: "b", full_name: "Bruno", account_status: "active" },
        ],
        sessoes: [
          { student_id: "a", completed_at: diasAtras(1) },
          { student_id: "b", completed_at: diasAtras(1) },
        ],
        totalTreinos: 12,
        totalDietas: 5,
        totalSessoesIa: 30,
      }),
    );

    const { stats } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(stats).toEqual({
      activeStudents: 2,
      workoutTemplates: 12,
      activeDietPlans: 5,
      aiSessions: 30,
    });
  });

  // Um aluno com dois serviços contratados tem duas linhas em
  // `student_specialists` — contá-lo duas vezes inflaria o número da tela.
  it("não conta o mesmo aluno duas vezes quando há dois vínculos", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        vinculos: [
          { student_id: "a", created_at: diasAtras(90) },
          { student_id: "a", created_at: diasAtras(90) },
        ],
        perfis: [{ id: "a", full_name: "Ana", account_status: "active" }],
        sessoes: [{ student_id: "a", completed_at: diasAtras(1) }],
      }),
    );

    const { stats } = await createBriefingService(supabase).fetchBriefing("esp-1");
    expect(stats.activeStudents).toBe(1);
  });
});
