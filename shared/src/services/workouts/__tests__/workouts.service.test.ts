import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createBodyScanService } from "../../assessment/bodyScan.service";
import { createWorkoutsService } from "../workouts.service";

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
      data: { id: "s1", perceived_exertion: 7, notes: "era o esquerdo" },
    });

    await createWorkoutsService(supabase).updateSessionFeedback("s1", {
      perceived_exertion: 7,
      notes: "era o esquerdo",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(payload.perceived_exertion).toBe(7);
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
   * A `0036` fecha isso no banco com `REVOKE UPDATE` + `GRANT UPDATE (perceived_exertion,
   * notes, feedback_edited_at)`. Este teste existe porque o erro do banco seria
   * um 42501 em runtime, longe de quem escreveu o caminho.
   */
  it("nunca manda coluna de medida no UPDATE, mesmo recebendo uma", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });

    await createWorkoutsService(supabase).updateSessionFeedback("s1", {
      perceived_exertion: 7,
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
          "Só perceived_exertion, notes e feedback_edited_at podem sair daqui — Art. 18, III. " +
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
    expect("perceived_exertion" in payload).toBe(false);
  });

  it("não toca em perceived_exertion quando só a observação é corrigida", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });
    await createWorkoutsService(supabase).updateSessionFeedback("s1", { notes: "novo texto" });
    expect("perceived_exertion" in (chamadas[0].payload as Record<string, unknown>)).toBe(false);
  });
});

describe("workoutsService — TRAVA LGPD: a sensação não é gravada (Art. 6°, III)", () => {
  /**
   * Art. 6°, III — necessidade. "Leve", "Na medida" e "Puxado" são a PSE dita
   * em palavra (`sensacaoDaPse`), e o banco guarda só o número. Gravar a
   * palavra também seria o mesmo dado duas vezes — e as duas cópias poderiam
   * discordar sobre o esforço que o aluno declarou.
   */
  it("grava a PSE e nenhuma coluna de sensação, mesmo recebendo uma", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "s1" } });

    await createWorkoutsService(supabase).createWorkoutSession({
      student_id: "aluno-1",
      workout_id: "treino-1",
      started_at: "2026-09-13T10:00:00Z",
      completed_at: "2026-09-13T11:00:00Z",
      perceived_exertion: 8,
      // O tipo recusa isto; o `as never` força o caso de quem contornar o tipo.
      sensacao: "puxado",
    } as never);

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.perceived_exertion).toBe(8);
    const derivadas = Object.keys(payload).filter((coluna) => /sensa|feel/i.test(coluna));
    if (derivadas.length > 0) {
      throw new Error(
        `DADO DUPLICADO: a sessão gravou a sensação derivada da PSE (${derivadas.join(", ")}). ` +
          "A palavra sai de sensacaoDaPse na leitura — Art. 6°, III e issue #295.",
      );
    }
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
  // O fluxo do aluno lê as sessões por aqui, e não pelo `workoutStore`, que
  // ainda tem a versão direta no Supabase para a tela do especialista (#292).
  // O rodízio e as marcas da semana só precisam de qual treino e quando —
  // nada da sessão além disso chega ao aparelho.
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

  // A detecção de FC no treino (#302) olha as sessões de cardio do próprio app,
  // e não as sessões de exercício do relógio. Ela precisa só do começo e do fim:
  // PSE, notas, distância ou modalidade na resposta seriam dado de saúde lido sem
  // uso (LGPD, Art. 6°, III).
  it("busca só o começo e o fim das sessões de cardio concluídas desde uma data", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: [{ started_at: "2026-09-10T10:00:00Z", completed_at: "2026-09-10T10:30:00Z" }],
    });

    const windows = await createWorkoutsService(supabase).fetchCardioWindowsSince(
      "aluno-1",
      "2026-08-15T00:00:00.000Z",
    );

    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].select).toBe("started_at, completed_at");
    expect(chamadas[0].filtros).toEqual({
      student_id: "aluno-1",
      session_type: "cardio",
      completed_at: "2026-08-15T00:00:00.000Z",
    });
    expect(windows).toEqual([
      { started_at: "2026-09-10T10:00:00Z", completed_at: "2026-09-10T10:30:00Z" },
    ]);
  });
});

describe("workoutsService — colunas das leituras do aluno", () => {
  // O aluno lê a própria periodização e as fases pela tela de vidro. `select("*")`
  // traria qualquer coluna que a tabela ganhe depois — de nota interna do
  // especialista a campo que nem existe hoje. Pedir o que a tela usa é o que
  // a minimização (LGPD, Art. 6°, III) quer dizer na prática.
  it("pede as colunas da periodização, e não a linha inteira", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createWorkoutsService(supabase).fetchStudentPeriodizations("aluno-1");

    expect(chamadas[0].select).toBe(
      "id, specialist_id, student_id, name, objective, status, start_date, end_date, created_at, updated_at",
    );
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
  });

  it("pede as colunas da fase, e não a linha inteira", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: [{ id: "f1" }] }, { data: [] }]);

    await createWorkoutsService(supabase).fetchTrainingPlans("periodizacao-1");

    expect(chamadas[0].select).toBe(
      "id, periodization_id, name, status, start_date, end_date, order_index, created_at",
    );
  });
});

describe("workoutsService — ajuste do exercício do catálogo", () => {
  it("atualiza só o campo pedido, do exercício pedido", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "ex-1" } });

    await createWorkoutsService(supabase).updateExercise("ex-1", {
      video_url: "https://video/remada",
    });

    expect(chamadas[0].tabela).toBe("exercises");
    expect(chamadas[0].filtros).toEqual({ id: "ex-1" });
    expect(chamadas[0].payload).toEqual({ video_url: "https://video/remada" });
  });

  // O ajuste da sessão apaga o vídeo mandando `null`. Uma string vazia ficaria
  // gravada como vídeo "existente" e o player tentaria abrir nada.
  it("apaga o vídeo quando recebe null", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "ex-1" } });

    await createWorkoutsService(supabase).updateExercise("ex-1", { video_url: null });

    expect(chamadas[0].payload).toEqual({ video_url: null });
  });

  it("propaga a recusa do banco em vez de fingir que salvou", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(
      createWorkoutsService(supabase).updateExercise("ex-1", { video_url: null }),
    ).rejects.toEqual({ message: "42501" });
  });
});
