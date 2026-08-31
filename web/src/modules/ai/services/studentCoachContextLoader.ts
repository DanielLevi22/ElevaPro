import { achatarRespostas } from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface StudentCoachContext {
  studentId: string;
  name: string;
  coachMode: "express" | "analytical";
  personaTrack: "beginner" | "returning" | "intermediate" | "advanced";
  anamnesis: Record<string, unknown> | null;
  lastAssessment: {
    weight_kg?: number;
    height_cm?: number;
    body_fat_pct?: number;
    date?: string;
  } | null;
  activePlan: { name: string; goal: string; status: string } | null;
}

export async function loadStudentCoachContext(studentId: string): Promise<StudentCoachContext> {
  const [profileRes, anamnesisRes, assessmentRes, planRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("full_name, coach_mode, persona_track")
      .eq("id", studentId)
      .single(),

    supabaseAdmin
      .from("student_anamnesis")
      .select("responses, completed_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("physical_assessments")
      // `weight_kg, height_cm, body_fat_pct, assessed_at`, não
      // `weight, height, body_fat_percentage, created_at`: as quatro nunca
      // existiram. O PostgREST recusava o `select` inteiro com 42703 e o erro
      // era descartado, então o coach do aluno dizia "sem avaliação" para quem
      // tinha uma. É o mesmo defeito que o `specialistContextLoader` já
      // corrigiu — aqui ele sobreviveu escondido pelo `as never`, que impede o
      // `check-column-refs` de enxergar a consulta.
      .select("weight_kg, height_cm, body_fat_pct, assessed_at")
      .eq("student_id", studentId)
      .order("assessed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("training_periodizations")
      // `objective`, não `goal`. Mesmo 42703, mesmo erro descartado: o aluno
      // com plano ativo via o coach afirmar que ele não tinha nenhum.
      .select("name, objective, status")
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileRes.data as {
    full_name: string;
    coach_mode: string | null;
    persona_track: string | null;
  } | null) ?? { full_name: "Aluno", coach_mode: null, persona_track: null };

  // Erro não é ausência. As duas consultas acima falhavam em silêncio porque
  // ninguém olhava o `error`, e "a consulta quebrou" chegava ao prompt como
  // "o aluno não tem" — que é a forma mais cara de um bug se esconder.
  for (const resultado of [anamnesisRes, assessmentRes, planRes]) {
    if (resultado.error) throw resultado.error;
  }

  const rawAssessment = assessmentRes.data as {
    weight_kg?: number;
    height_cm?: number;
    body_fat_pct?: number;
    assessed_at?: string;
  } | null;

  const lastAssessment = rawAssessment
    ? {
        weight_kg: rawAssessment.weight_kg,
        height_cm: rawAssessment.height_cm,
        body_fat_pct: rawAssessment.body_fat_pct,
        date: rawAssessment.assessed_at,
      }
    : null;

  const bruto = planRes.data as { name: string; objective: string; status: string } | null;
  const rawPlan = bruto ? { name: bruto.name, goal: bruto.objective, status: bruto.status } : null;

  // Achatada aqui, uma vez, e não em cada consumidor. Três leem este campo — o
  // formatador do prompt, o resumo de perfil e o cálculo de prontidão —, e o
  // formatador interpola direto: objeto vira "[object Object]", que não é vazio
  // e passa pelo `if (a.injuries)` como se fosse a contraindicação do aluno.
  // `null` preservado: anamnese ausente e anamnese vazia dizem coisas
  // diferentes ao modelo.
  const respostas = (anamnesisRes.data as { responses: Record<string, unknown> } | null)?.responses;

  return {
    studentId,
    name: profile.full_name,
    coachMode: (profile.coach_mode as "express" | "analytical") ?? "express",
    personaTrack:
      (profile.persona_track as "beginner" | "returning" | "intermediate" | "advanced") ??
      "beginner",
    anamnesis: respostas ? achatarRespostas(respostas) : null,
    lastAssessment,
    activePlan: rawPlan,
  };
}

export function formatStudentCoachContext(ctx: StudentCoachContext): string {
  const lines: string[] = [`Aluno: ${ctx.name}`];

  if (ctx.lastAssessment) {
    const a = ctx.lastAssessment;
    lines.push("\n--- DADOS FÍSICOS ---");
    if (a.weight_kg) lines.push(`Peso: ${a.weight_kg} kg`);
    if (a.height_cm) lines.push(`Altura: ${a.height_cm} cm`);
    if (a.body_fat_pct) lines.push(`% Gordura estimado: ${a.body_fat_pct}%`);
    if (a.date) lines.push(`Data da avaliação: ${new Date(a.date).toLocaleDateString("pt-BR")}`);
  } else {
    lines.push("\n--- DADOS FÍSICOS ---\nNenhuma avaliação registrada.");
  }

  if (ctx.anamnesis) {
    const a = ctx.anamnesis;
    lines.push("\n--- PERFIL DE TREINO ---");
    if (a.main_goal) lines.push(`Objetivo: ${a.main_goal}`);
    if (a.gender) lines.push(`Sexo: ${a.gender}`);
    if (a.experience_level) lines.push(`Experiência: ${a.experience_level}`);
    if (a.training_days) lines.push(`Dias disponíveis: ${a.training_days}x/semana`);
    if (a.training_time_before_break) {
      lines.push(`Tempo de treino antes da pausa: ${a.training_time_before_break}`);
    }
    if (a.training_duration) lines.push(`Tempo por sessão: ${a.training_duration} min`);
    if (a.gym_type) lines.push(`Local de treino: ${a.gym_type}`);
    if (a.dietary_restrictions) lines.push(`Restrições alimentares: ${a.dietary_restrictions}`);
    if (a.injuries) lines.push(`Lesões/Contraindicações: ${a.injuries}`);
    if (a.sleep_hours) lines.push(`Horas de sono: ${a.sleep_hours}h`);
    if (a.stress_level) lines.push(`Nível de estresse: ${a.stress_level}`);
    if (a.squat_rm) lines.push(`Agachamento (1RM aprox.): ${a.squat_rm} kg`);
    if (a.bench_rm) lines.push(`Supino (1RM aprox.): ${a.bench_rm} kg`);
    if (a.food_preferences) lines.push(`Preferências alimentares: ${a.food_preferences}`);
    if (a.session_time_preference) lines.push(`Prefere treinar: ${a.session_time_preference}`);
    if (a.supplements) lines.push(`Suplementação: ${a.supplements}`);
  } else {
    lines.push("\n--- PERFIL DE TREINO ---\nAnamnese não preenchida.");
  }

  if (ctx.activePlan) {
    lines.push(
      `\n--- PLANO ATUAL ---\n${ctx.activePlan.name} — ${ctx.activePlan.goal} (${ctx.activePlan.status})`,
    );
  }

  return lines.join("\n");
}

/**
 * A duração de um treino, com unidade sem duplicar.
 *
 * As duas anamneses guardam formas diferentes na mesma chave: a geral pergunta
 * "Tempo médio por treino (minutos)" e grava um número; a adaptativa oferece
 * faixas e grava `"45–60 min"`. Colar " min" nos dois fazia quem veio pela
 * adaptativa chegar ao modelo como `"45–60 min min"`.
 *
 * A unidade é acrescentada só quando o valor não a traz — que é o que distingue
 * um número de uma faixa já escrita.
 */
function duracaoPorTreino(bruto: unknown): string {
  return typeof bruto === "number" ? `${bruto} min` : String(bruto);
}

export function buildProfileSummary(ctx: StudentCoachContext): Record<string, string | null> {
  const a = ctx.anamnesis ?? {};
  return {
    objetivo: (a.main_goal as string) ?? null,
    peso_altura: ctx.lastAssessment
      ? `${ctx.lastAssessment.weight_kg ?? "?"} kg · ${ctx.lastAssessment.height_cm ?? "?"} cm`
      : null,
    experiencia: (a.experience_level as string) ?? (a.training_time as string) ?? null,
    frequencia:
      a.training_days && a.training_duration
        ? `${a.training_days}x/semana · ${duracaoPorTreino(a.training_duration)}`
        : null,
    local: (a.gym_type as string) ?? null,
    dieta: (a.dietary_restrictions as string) ?? "Sem restrições",
    lesoes: (a.injuries as string) ?? "Nenhuma",
  };
}
