import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityAuthorFilter,
  ActivityDay,
  ActivityDaySummary,
  ActivityEvent,
  RecentActivityItem,
  WorkoutSessionRow,
} from "../types/activity.types";

/**
 * Quantos itens o bloco "Aconteceu" do briefing mostra.
 *
 * O corte acontece **uma vez, no resultado já ordenado**. O bloco anterior
 * somava três consultas com teto próprio — 5 treinos, 3 alunos novos, 3 dietas
 * — e cortava a soma em 10: um especialista com 20 treinos concluídos no dia
 * via 5, e nenhuma quantidade de atividade fazia o sexto aparecer.
 */
const RECENT_LIMIT = 10;

/**
 * Não há janela de dias, e a ausência dela é a correção.
 *
 * O bloco antigo filtrava os últimos 7 dias, então especialista voltando de
 * férias via "Nenhuma atividade recente" com o histórico cheio. Para "os 10
 * últimos", a pergunta é de ordenação, não de intervalo: ordena por data e pega
 * 10. Este teto existe só para o banco não varrer o histórico inteiro por
 * aluno, e é generoso de propósito.
 */
const RECENT_SCAN = 200;

// As colunas de `workout_sessions` aparecem escritas por extenso em cada
// `.select()`, e não numa constante compartilhada. É deliberado:
// `check-column-refs.js` casa `.from("tabela")` com o PRÓXIMO `.select()` de
// string literal, então uma constante faz a guarda pular adiante e conferir
// esta lista contra a tabela da consulta seguinte — foi assim que ela acusou
// `workout_sessions.logged_date`, que é coluna de `meal_logs`.
//
// Repetir dez nomes é mais barato que perder a guarda que existe justamente
// para pegar coluna inexistente. E `workout_sessions` é tabela sensível pela
// LGPD_COMPLIANCE.md: `select("*")` nela é recusado.

const DIA_MS = 86_400_000;

/** `YYYY-MM-DD` do instante, na zona de quem lê. O feed agrupa pelo dia local. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function minutos(segundos: number | null): string | null {
  if (segundos === null || segundos <= 0) return null;
  return `${Math.round(segundos / 60)} min`;
}

/**
 * Monta a linha secundária do cardio a partir das colunas, não da string.
 *
 * Sessão anterior à `0035` chega com as três nulas: duração e calorias moravam
 * dentro de `notes` e não são recuperáveis. Devolve `null` em vez de "0 min",
 * porque zero é uma medida e ausência não é.
 */
function detalheCardio(row: WorkoutSessionRow): string | null {
  const partes = [minutos(row.duration_seconds)];
  if (row.active_calories !== null) partes.push(`${row.active_calories} kcal`);
  const preenchidas = partes.filter((p): p is string => p !== null);
  return preenchidas.length > 0 ? preenchidas.join(" · ") : null;
}

/**
 * Extrai o título do treino embutido pelo PostgREST.
 *
 * O embed de relação para-um chega como objeto em tempo de execução, mas os
 * tipos gerados o declaram como array — daí as duas formas. A alternativa que
 * o código antigo usava era `as unknown as { title: string } | null`, que
 * silencia o compilador e quebra em silêncio se a cardinalidade mudar.
 */
function tituloEmbutido(embed: { title: string } | { title: string }[] | null): string | null {
  if (!embed) return null;
  const linha = Array.isArray(embed) ? embed[0] : embed;
  return linha?.title ?? null;
}

function tituloSessao(row: WorkoutSessionRow, tituloTreino: string | null): string {
  if (row.session_type === "cardio") return row.activity_name ?? "Cardio";
  return tituloTreino ?? "Treino";
}

function eventoDeSessao(row: WorkoutSessionRow, tituloTreino: string | null): ActivityEvent {
  return {
    id: `session-${row.id}`,
    kind: row.session_type === "cardio" ? "cardio" : "workout",
    // `sessions_own` é FOR ALL do aluno: só ele insere sessão. Ver RLS 0017.
    author: "student",
    at: row.completed_at ?? row.started_at,
    title: tituloSessao(row, tituloTreino),
    detail: row.session_type === "cardio" ? detalheCardio(row) : null,
    pse: row.perceived_exertion,
    studentNote: row.notes,
    noteEditedAt: row.feedback_edited_at,
  };
}

interface LinhaMeta {
  student_id: string;
  date: string;
  meals_target: number;
  meals_completed: number;
  workout_target: number;
  workout_completed: number;
  completed: boolean;
}

function resumoDe(meta: LinhaMeta): ActivityDaySummary {
  return {
    mealsTarget: meta.meals_target,
    mealsCompleted: meta.meals_completed,
    workoutTarget: meta.workout_target,
    workoutCompleted: meta.workout_completed,
    completed: meta.completed,
  };
}

/**
 * Preenche os dias sem nenhum registro entre o primeiro e o último evento.
 *
 * Um dia vazio aparece como "sem registro" em vez de sumir porque, para o
 * especialista, **a ausência é a informação**: três dias vazios seguidos é
 * exatamente o que ele precisa ver, e uma lista que pula de 28/08 para 24/08
 * esconde isso atrás de uma diferença de data que ninguém calcula de cabeça.
 */
function preencherVazios(dias: Map<string, ActivityDay>): ActivityDay[] {
  const chaves = [...dias.keys()].sort();
  if (chaves.length === 0) return [];

  const resultado: ActivityDay[] = [];
  const fim = new Date(`${chaves[chaves.length - 1]}T00:00:00Z`).getTime();
  let cursor = new Date(`${chaves[0]}T00:00:00Z`).getTime();

  while (cursor <= fim) {
    const dia = new Date(cursor).toISOString().slice(0, 10);
    resultado.push(dias.get(dia) ?? { date: dia, summary: null, events: [] });
    cursor += DIA_MS;
  }

  return resultado.reverse();
}

export const createActivityService = (supabase: SupabaseClient) => ({
  /**
   * Os 10 eventos mais recentes dos alunos vinculados a este especialista.
   *
   * O universo sai de `student_specialists` com vínculo `active`, e não de
   * `workouts.specialist_id`. A diferença não é cosmética: "treinos que eu
   * criei" e "alunos que são meus" divergem sempre que o aluno executa algo que
   * o especialista não prescreveu — cardio livre, treino que o member montou
   * para si. Com o filtro antigo, **nenhuma sessão de cardio podia aparecer**,
   * de nenhum aluno, nunca.
   *
   * @example
   * const itens = await activity.fetchRecentActivity(specialistId);
   */
  fetchRecentActivity: async (specialistId: string): Promise<RecentActivityItem[]> => {
    const { data: links, error: linksError } = await supabase
      .from("student_specialists")
      .select("student_id")
      .eq("specialist_id", specialistId)
      .eq("status", "active");

    if (linksError) throw linksError;

    const studentIds = [
      ...new Set((links ?? []).map((l) => (l as { student_id: string }).student_id)),
    ];
    if (studentIds.length === 0) return [];

    // Independentes: em série, a tela espera três idas ao banco antes de pintar
    // a primeira linha. O bloco anterior fazia exatamente isso.
    const [sessoes, refeicoes, perfis] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select(
          "id, student_id, started_at, completed_at, perceived_exertion, notes, session_type, duration_seconds, active_calories, activity_name",
        )
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(RECENT_SCAN),

      supabase
        .from("meal_logs")
        .select("id, student_id, logged_date, completed")
        .in("student_id", studentIds)
        .eq("completed", true)
        .order("logged_date", { ascending: false })
        .limit(RECENT_SCAN),

      supabase.from("profiles").select("id, full_name").in("id", studentIds),
    ]);

    if (sessoes.error) throw sessoes.error;
    if (refeicoes.error) throw refeicoes.error;
    if (perfis.error) throw perfis.error;

    const nomes = new Map(
      (perfis.data ?? []).map((p) => {
        const perfil = p as { id: string; full_name: string | null };
        return [perfil.id, perfil.full_name ?? "Aluno"];
      }),
    );

    const itens: RecentActivityItem[] = [];

    for (const linha of (sessoes.data ?? []) as WorkoutSessionRow[]) {
      itens.push({
        id: `session-${linha.id}`,
        studentId: linha.student_id,
        studentName: nomes.get(linha.student_id) ?? "Aluno",
        kind: linha.session_type === "cardio" ? "cardio" : "workout",
        // Sem `notes`: o que atravessa a fronteira é o item resumido. O bloco
        // vive no briefing, que é Server Component justamente para o dado de
        // saúde cru não chegar ao HTML da página.
        title: tituloSessao(linha, null),
        pse: linha.perceived_exertion,
        at: linha.completed_at ?? linha.started_at,
      });
    }

    for (const linha of (refeicoes.data ?? []) as {
      id: string;
      student_id: string;
      logged_date: string;
    }[]) {
      itens.push({
        id: `meal-${linha.id}`,
        studentId: linha.student_id,
        studentName: nomes.get(linha.student_id) ?? "Aluno",
        kind: "meal",
        title: "Registrou uma refeição",
        pse: null,
        at: linha.logged_date,
      });
    }

    // Ordena o conjunto inteiro e corta uma vez só.
    itens.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return itens.slice(0, RECENT_LIMIT);
  },

  /**
   * As atividades de um aluno, agrupadas por dia, em ordem decrescente.
   *
   * O agrupamento acontece aqui, no servidor: mandar listas cruas para o
   * cliente montar o calendário é trabalho de renderização que não precisa
   * existir — e, no caso do `notes`, é dado de saúde viajando sem necessidade.
   *
   * @example
   * const dias = await activity.fetchStudentActivities(alunoId, "student");
   */
  fetchStudentActivities: async (
    studentId: string,
    autoria: ActivityAuthorFilter = "student",
  ): Promise<ActivityDay[]> => {
    const [sessoes, refeicoes, metas, avaliacoes, dietas] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select(
          "id, student_id, started_at, completed_at, perceived_exertion, notes, feedback_edited_at, session_type, duration_seconds, active_calories, activity_name, workout:workouts(title)",
        )
        .eq("student_id", studentId)
        .order("started_at", { ascending: false })
        .limit(RECENT_SCAN),

      supabase
        .from("meal_logs")
        .select("id, student_id, logged_date, completed")
        .eq("student_id", studentId)
        .eq("completed", true)
        .order("logged_date", { ascending: false })
        .limit(RECENT_SCAN),

      supabase
        .from("daily_goals")
        .select(
          "student_id, date, meals_target, meals_completed, workout_target, workout_completed, completed",
        )
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(RECENT_SCAN),

      supabase
        .from("physical_assessments")
        .select("id, created_at, weight_kg")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(RECENT_SCAN),

      supabase
        .from("diet_plans")
        .select("id, name, created_at, status, specialist_id")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(RECENT_SCAN),
    ]);

    for (const r of [sessoes, refeicoes, metas, avaliacoes, dietas]) {
      if (r.error) throw r.error;
    }

    const eventos: ActivityEvent[] = [];

    for (const linha of (sessoes.data ?? []) as unknown as (WorkoutSessionRow & {
      workout: { title: string } | { title: string }[] | null;
    })[]) {
      eventos.push(eventoDeSessao(linha, tituloEmbutido(linha.workout)));
    }

    for (const linha of (refeicoes.data ?? []) as { id: string; logged_date: string }[]) {
      eventos.push({
        id: `meal-${linha.id}`,
        kind: "meal",
        // `student_own_meal_logs` é FOR ALL do aluno; o especialista só lê.
        author: "student",
        at: linha.logged_date,
        title: "Refeição registrada",
        detail: null,
        pse: null,
        studentNote: null,
        noteEditedAt: null,
      });
    }

    for (const linha of (avaliacoes.data ?? []) as {
      id: string;
      created_at: string;
      weight_kg: number | null;
    }[]) {
      eventos.push({
        id: `assessment-${linha.id}`,
        kind: "assessment",
        // `assessments_specialist_insert`: só o especialista insere.
        author: "specialist",
        at: linha.created_at,
        title: "Avaliação física",
        detail: linha.weight_kg ? `${linha.weight_kg} kg` : "Medidas registradas",
        pse: null,
        studentNote: null,
        noteEditedAt: null,
      });
    }

    for (const linha of (dietas.data ?? []) as {
      id: string;
      name: string | null;
      created_at: string;
      status: string;
      specialist_id: string | null;
    }[]) {
      eventos.push({
        id: `diet-${linha.id}`,
        kind: "diet_plan",
        // O caso que uma lista escrita à mão erraria: o mesmo tipo de evento
        // tem autores diferentes conforme a linha. `specialist_id` nulo
        // significa que o próprio member criou o plano para si.
        author: linha.specialist_id === null ? "student" : "specialist",
        at: linha.created_at,
        title: linha.name ?? "Plano alimentar",
        detail: linha.status === "active" ? "Plano ativo" : "Plano encerrado",
        pse: null,
        studentNote: null,
        noteEditedAt: null,
      });
    }

    const visiveis =
      autoria === "all" ? eventos : eventos.filter((evento) => evento.author === autoria);

    const resumos = new Map(
      (metas.data ?? []).map((m) => {
        const meta = m as LinhaMeta;
        return [meta.date, resumoDe(meta)];
      }),
    );

    const dias = new Map<string, ActivityDay>();

    for (const evento of visiveis) {
      const dia = diaLocal(evento.at);
      const existente = dias.get(dia);
      if (existente) existente.events.push(evento);
      else dias.set(dia, { date: dia, summary: resumos.get(dia) ?? null, events: [evento] });
    }

    // Dia com meta e sem evento visível ainda é notícia: significa que a
    // gamificação registrou alvo e o aluno não cumpriu nada dele.
    for (const [dia, resumo] of resumos) {
      if (!dias.has(dia)) dias.set(dia, { date: dia, summary: resumo, events: [] });
    }

    for (const dia of dias.values()) {
      dia.events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }

    return preencherVazios(dias);
  },
});
