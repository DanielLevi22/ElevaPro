import { describe, expect, it } from "vitest";
import { createBodyScanService } from "../bodyScan.service";
import { createWorkoutsService } from "../workouts.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("workoutsService — catálogo de exercícios", () => {
  // Regressão: o filtro de linhas-placeholder vivia no hook do web, então o
  // mobile listava "Adicionar exercício" como se fosse exercício de verdade.
  // Aqui ele vale para as duas plataformas.
  it("esconde as linhas-placeholder do catálogo", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        { id: "1", name: "Supino reto" },
        { id: "2", name: "Adicionar exercício" },
        { id: "3", name: "adicionar exercicios" },
        { id: "4", name: "   " },
        { id: "5", name: "Agachamento" },
      ],
    });

    const exercicios = await createWorkoutsService(supabase).fetchExercises();
    expect(exercicios.map((e) => e.name)).toEqual(["Supino reto", "Agachamento"]);
  });

  it("propaga erro em vez de devolver catálogo vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createWorkoutsService(supabase).fetchExercises()).rejects.toEqual({
      message: "42501",
    });
  });
});

describe("workoutsService — periodizações", () => {
  // Regressão do DT-23. `start_date` e `end_date` são NOT NULL desde a
  // migration `0024`. Enquanto o tipo os declarava opcionais, o serviço mandava
  // `null` e o banco recusava o insert — criar periodização falhava sempre, e
  // nada no compilador acusava.
  it("manda as datas que o banco exige, sem null", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "p1" } });

    await createWorkoutsService(supabase).createPeriodization({
      student_id: "aluno-1",
      specialist_id: "esp-1",
      name: "Hipertrofia",
      start_date: "2026-09-01",
      end_date: "2026-12-01",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.start_date).toBe("2026-09-01");
    expect(payload.end_date).toBe("2026-12-01");
    expect(payload.status).toBe("planned");
  });

  // Duas periodizações ativas para o mesmo aluno tornam ambíguo qual está
  // valendo. Ativar uma precisa encerrar a anterior na mesma operação.
  it("encerra a periodização ativa do aluno ao ativar outra", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { student_id: "aluno-1" } },
      {},
      { data: { id: "p2", status: "active" } },
    ]);

    await createWorkoutsService(supabase).activatePeriodization("p2");

    expect(chamadas[1].payload).toEqual({ status: "completed" });
    expect(chamadas[1].filtros).toEqual({ student_id: "aluno-1", status: "active" });
    expect(chamadas[2].payload).toEqual({ status: "active" });
    expect(chamadas[2].filtros).toEqual({ id: "p2" });
  });

  it("propaga erro da busca sem tentar ativar nada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ error: { message: "não encontrada" } });
    await expect(createWorkoutsService(supabase).activatePeriodization("p2")).rejects.toEqual({
      message: "não encontrada",
    });
    expect(chamadas).toHaveLength(1);
  });
});

describe("workoutsService — fichas de treino", () => {
  it("manda as datas obrigatórias ao criar a ficha", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "f1" } });

    await createWorkoutsService(supabase).createTrainingPlan({
      periodization_id: "p1",
      name: "Fase 1",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.start_date).toBe("2026-09-01");
    expect(payload.end_date).toBe("2026-09-30");
    expect(payload.order_index).toBe(0);
  });

  // A cópia nasce "planned", nunca herdando o status da original: clonar uma
  // ficha ativa não pode ativar duas ao mesmo tempo.
  it("clona a ficha como planejada, marcando o nome", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      {
        data: {
          id: "f1",
          periodization_id: "p1",
          name: "Fase 1",
          status: "active",
          start_date: "2026-09-01",
          end_date: "2026-09-30",
          order_index: 2,
        },
      },
      { data: { id: "f2" } },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");

    const payload = chamadas[1].payload as Record<string, unknown>;
    expect(payload.name).toBe("Fase 1 (Cópia)");
    expect(payload.status).toBe("planned");
    expect(payload.order_index).toBe(2);
  });

  it("copia os treinos da ficha original para a cópia", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "f1", periodization_id: "p1", name: "Fase 1" } },
      { data: { id: "f2" } },
      {
        data: [
          { specialist_id: "esp-1", title: "Treino A", muscle_group: "peito", difficulty: null },
        ],
      },
      {},
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");

    const copiados = chamadas[3].payload as Record<string, unknown>[];
    expect(copiados[0].training_plan_id).toBe("f2");
    expect(copiados[0].title).toBe("Treino A");
    // O id da original não pode viajar junto, senão a cópia sobrescreve.
    expect(copiados[0]).not.toHaveProperty("id");
  });

  it("não tenta copiar treino quando a ficha original está vazia", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "f1", name: "Fase 1" } },
      { data: { id: "f2" } },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");
    expect(chamadas).toHaveLength(3);
  });
});

describe("workoutsService — exercícios do treino", () => {
  // A ordem na tela vem de `order_index`. Sem o índice do laço como padrão,
  // vários exercícios entrariam com o mesmo valor e a ordem viraria a do banco.
  it("usa a posição na lista quando o item não traz order_index", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [
      { exercise_id: "e1", sets: 3, reps: "10" },
      { exercise_id: "e2", sets: 4, reps: "8" },
      { exercise_id: "e3", sets: 3, reps: "12", order_index: 9 },
    ]);

    const linhas = chamadas[0].payload as Record<string, unknown>[];
    expect(linhas.map((l) => l.order_index)).toEqual([0, 1, 9]);
    expect(linhas.every((l) => l.workout_id === "t1")).toBe(true);
  });

  // Campo ausente vira `null`, não `undefined`: o PostgREST omite chave
  // `undefined` do corpo, e a coluna ficaria com o default em vez de vazia.
  it("normaliza campo ausente para null", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [{ exercise_id: "e1" }]);

    const linha = (chamadas[0].payload as Record<string, unknown>[])[0];
    expect(linha.sets).toBeNull();
    expect(linha.reps).toBeNull();
    expect(linha.weight).toBeNull();
    expect(linha.notes).toBeNull();
  });
});

/**
 * ── TRAVAS LGPD — correção do feedback (migration 0036) ──────────────────────
 *
 * Estes testes NÃO verificam que a correção funciona. Verificam que ela
 * continua restrita ao que o titular DECLAROU. Se um deles barrar você, o
 * caminho não é ajustar o teste: é reler o parecer em
 * `docs/PRDs/session-feedback-correction.md` e a seção 10 do
 * `docs/LGPD_COMPLIANCE.md`.
 *
 * A prova de banco correspondente está em `scripts/verify-rls.sql` — lá o
 * privilégio de coluna é afirmado contra o Postgres de verdade. Aqui a trava é
 * sobre o payload que sai do serviço.
 */
describe("workoutsService — TRAVA LGPD: correção do feedback (Art. 18, III)", () => {
  it("corrige a declaração do titular e carimba a data da correção", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { id: "s1", intensity: 7, notes: "era o esquerdo" },
    });

    await createWorkoutsService(supabase).updateSessionFeedback("s1", {
      intensity: 7,
      notes: "era o esquerdo",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(payload.intensity).toBe(7);
    expect(payload.notes).toBe("era o esquerdo");
    // Sem o carimbo, a correção é indistinguível de o aluno ter escrito aquilo
    // desde o começo — e o especialista, que já leu a versão anterior, não teria
    // como saber que a frase mudou.
    expect(typeof payload.feedback_edited_at).toBe("string");
  });

  /**
   * Art. 18, III + Art. 6°, V — o titular corrige o que DECLAROU, nunca o que
   * foi MEDIDO. Digitar outro número não devolve exatidão a uma medida: cria um
   * dado falso que o profissional usa para prescrever.
   *
   * A `0036` fecha isso no banco com `REVOKE UPDATE` + `GRANT UPDATE (intensity,
   * notes, feedback_edited_at)`. Este teste existe porque o erro do banco seria
   * um 42501 em runtime, longe de quem escreveu o caminho.
   */
  it("nunca manda coluna de medida no UPDATE, mesmo recebendo uma", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });

    await createWorkoutsService(supabase).updateSessionFeedback("s1", {
      intensity: 7,
      notes: "ok",
      // O tipo recusa isto; o `as never` força o caso de quem contornar o tipo.
      completed_at: "2020-01-01T00:00:00Z",
      session_type: "cardio",
      duration_seconds: 9999,
      student_id: "outro-aluno",
    } as never);

    const payload = chamadas[0].payload as Record<string, unknown>;
    const proibidas = [
      "started_at",
      "completed_at",
      "session_type",
      "duration_seconds",
      "active_calories",
      "student_id",
      "workout_id",
    ];
    const vazadas = proibidas.filter((coluna) => coluna in payload);

    if (vazadas.length > 0) {
      throw new Error(
        `HISTÓRICO REESCRITO: updateSessionFeedback enviou coluna de medida (${vazadas.join(", ")}). ` +
          "Só intensity, notes e feedback_edited_at podem sair daqui — Art. 18, III. " +
          "Ver a migration 0036 e o bloco de prova em scripts/verify-rls.sql",
      );
    }
  });

  /**
   * Art. 18, VI — apagar a observação elimina a parte consentida e mantém a
   * sessão. É o desenho inteiro do PRD numa linha: a execução é execução de
   * contrato (Art. 7°, V) e continua no histórico.
   */
  it("apaga só a observação, gravando null e não string vazia", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });

    await createWorkoutsService(supabase).updateSessionFeedback("s1", { notes: "   " });

    const payload = chamadas[0].payload as Record<string, unknown>;
    // String em branco no banco é um texto que existe e não diz nada: o feed
    // renderizaria aspas vazias, e a coluna deixaria de distinguir "não escreveu"
    // de "apagou".
    expect(payload.notes).toBeNull();
    expect("intensity" in payload).toBe(false);
  });

  it("não toca em intensity quando só a observação é corrigida", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });
    await createWorkoutsService(supabase).updateSessionFeedback("s1", { notes: "novo texto" });
    expect("intensity" in (chamadas[0].payload as Record<string, unknown>)).toBe(false);
  });
});

describe("bodyScanService — TRAVA LGPD: eliminação (Art. 18, VI)", () => {
  it("apaga a análise sem repetir o filtro de dono que a RLS já aplica", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await createBodyScanService(supabase).deleteOwn("scan-1");

    expect(chamadas[0].tabela).toBe("body_scans");
    expect(chamadas[0].filtros).toEqual({ id: "scan-1" });
    // Sem `student_id` no filtro de propósito: `body_scans_own` (migration 0017)
    // já restringe à própria linha. Duplicar a regra no cliente é onde as duas
    // cópias divergem — e a do cliente é a que ninguém audita.
    expect("student_id" in chamadas[0].filtros).toBe(false);
  });

  it("propaga o erro em vez de fingir que apagou", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createBodyScanService(supabase).deleteOwn("scan-1")).rejects.toEqual({
      message: "42501",
    });
  });
});

describe("workoutsService — sessões que decidem o próximo treino", () => {
  // As duas consultas saíram do `workoutStore` do mobile, que as fazia direto
  // no Supabase (#292). O rodízio e as marcas da semana só precisam de qual
  // treino e quando — nada da sessão além disso chega ao aparelho.
  it("busca a última sessão de força concluída, só com treino e data", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { workout_id: "w1", completed_at: "2026-09-10T20:00:00Z" },
    });

    const ultima = await createWorkoutsService(supabase).fetchLastWorkoutSession("aluno-1");

    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].select).toBe("workout_id, completed_at");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
    // Sessão de cardio não tem treino de fase; entrar no rodízio a desviaria.
    expect(chamadas[0].metodos.map((m) => m.nome)).toContain("not");
    expect(ultima).toEqual({ workout_id: "w1", completed_at: "2026-09-10T20:00:00Z" });
  });

  it("sem sessão nenhuma devolve null, e não lança", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createWorkoutsService(supabase).fetchLastWorkoutSession("aluno-1")).toBeNull();
  });

  it("busca as sessões desde o começo da semana, só com treino e data", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: [{ workout_id: "w1", completed_at: "2026-09-08T12:00:00Z" }],
    });

    const sessoes = await createWorkoutsService(supabase).fetchCompletedSessionsSince(
      "aluno-1",
      "2026-09-07T07:00:00.000Z",
    );

    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].select).toBe("workout_id, completed_at");
    expect(chamadas[0].filtros).toEqual({
      student_id: "aluno-1",
      completed_at: "2026-09-07T07:00:00.000Z",
    });
    expect(sessoes).toHaveLength(1);
  });
});
