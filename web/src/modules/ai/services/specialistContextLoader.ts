import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StudentContext, StudentHealthContext } from "../types";

/**
 * Contexto do aluno para o coach do especialista.
 *
 * Duas coisas que este arquivo errava, e que sobreviveram porque falha e
 * ausência tinham a mesma aparência:
 *
 * 1. Lia `a.injuries` do topo da linha. `student_anamnesis` só tem
 *    `responses jsonb` — os campos moram lá dentro.
 * 2. Consultava `weight, height, body_fat_percentage`, colunas que não existem
 *    (`weight_kg`, `height_cm`, `body_fat_pct`), e descartava o `42703`.
 *
 * O resultado: uma aluna com "Hérnia de disco L5-S1 — proibido agachamento
 * livre" registrada aparecia para o modelo como "Lesões: nenhuma registrada",
 * e o prompt manda ele usar exatamente esse campo para decidir a prescrição.
 *
 * Por isso toda consulta aqui distingue erro de vazio.
 */

const CONSENT_HEALTH_COLLECTION = "health_data_collection";

/** Só o que o prompt usa. O `select("*")` anterior lia a anamnese inteira. */
const ANAMNESIS_FIELDS = [
  "objective",
  "training_experience",
  "training_frequency",
  "available_days",
  "injuries",
  "health_conditions",
] as const;

function text(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const asText = String(value).trim();
  return asText.length > 0 ? asText : undefined;
}

function numeric(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : undefined;
}

/**
 * Consentimento vigente de coleta de dado de saúde.
 *
 * Fica antes da leitura, não depois: sem base legal o dado não deve nem sair do
 * banco. Ver o parecer em `docs/PRDs/ai-coach-workout-stage.md`.
 */
async function hasHealthConsent(studentId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("student_consents")
    .select("given_at, revoked_at")
    .eq("student_id", studentId)
    .eq("consent_type", CONSENT_HEALTH_COLLECTION)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;
  return Boolean(data.given_at) && !data.revoked_at;
}

async function loadHealth(studentId: string): Promise<StudentHealthContext> {
  const [anamnesisRes, assessmentRes] = await Promise.all([
    supabaseAdmin
      .from("student_anamnesis")
      .select("responses")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("physical_assessments")
      .select("weight_kg, height_cm, body_fat_pct, assessed_at")
      .eq("student_id", studentId)
      .order("assessed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (anamnesisRes.error) throw anamnesisRes.error;
  if (assessmentRes.error) throw assessmentRes.error;

  const responses = (anamnesisRes.data?.responses ?? {}) as Record<string, unknown>;
  const assessment = assessmentRes.data;

  const health: StudentHealthContext = {
    objective: text(responses[ANAMNESIS_FIELDS[0]]),
    trainingExperience: text(responses[ANAMNESIS_FIELDS[1]]),
    trainingFrequency: text(responses[ANAMNESIS_FIELDS[2]]),
    availableDays: text(responses[ANAMNESIS_FIELDS[3]]),
    injuries: text(responses[ANAMNESIS_FIELDS[4]]),
    healthConditions: text(responses[ANAMNESIS_FIELDS[5]]),
    weightKg: numeric(assessment?.weight_kg),
    heightCm: numeric(assessment?.height_cm),
    bodyFatPct: numeric(assessment?.body_fat_pct),
  };

  return health;
}

export async function loadStudentContext(
  studentId: string,
  specialistId: string,
): Promise<StudentContext> {
  const [consent, periodizationsRes] = await Promise.all([
    hasHealthConsent(studentId),
    supabaseAdmin
      .from("training_periodizations")
      // `objective`, não `goal`: a coluna sempre se chamou assim, e
      // `savePeriodization` escreve nela. A leitura pedia `goal`, o PostgREST
      // devolvia 42703 e o erro era descartado — o coach dizia "nenhuma
      // periodização criada" mesmo quando havia.
      .select(
        `
        id, name, objective, status,
        training_plans(id, name, duration_weeks, focus)
      `,
      )
      .eq("student_id", studentId)
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (periodizationsRes.error) throw periodizationsRes.error;

  const periodizations = ((periodizationsRes.data as unknown[]) ?? []).map((p: unknown) => {
    const period = p as {
      id: string;
      name: string;
      objective: string;
      status: string;
      training_plans: { id: string; name: string; duration_weeks: number; focus: string }[];
    };
    return {
      id: period.id,
      name: period.name,
      goal: period.objective,
      status: period.status,
      phases: (period.training_plans ?? []).map((pl) => ({
        id: pl.id,
        name: pl.name,
        weeks: pl.duration_weeks,
        focus: pl.focus,
      })),
    };
  });

  return {
    studentId,
    health: consent ? await loadHealth(studentId) : null,
    healthUnavailableReason: consent ? null : "no_consent",
    periodizations,
  };
}

function healthLines(health: StudentHealthContext): string[] {
  const lines: string[] = [];
  const rotulos: [keyof StudentHealthContext, string][] = [
    ["objective", "Objetivo"],
    ["trainingExperience", "Experiência"],
    ["trainingFrequency", "Frequência semanal"],
    ["availableDays", "Dias disponíveis"],
    ["injuries", "Lesões/Restrições"],
    ["healthConditions", "Condições de saúde"],
  ];

  for (const [campo, rotulo] of rotulos) {
    const valor = health[campo];
    if (valor !== undefined) lines.push(`${rotulo}: ${valor}`);
  }

  const medidas: string[] = [];
  if (health.weightKg !== undefined) medidas.push(`Peso: ${health.weightKg} kg`);
  if (health.heightCm !== undefined) medidas.push(`Altura: ${health.heightCm} cm`);
  if (health.bodyFatPct !== undefined) medidas.push(`% Gordura: ${health.bodyFatPct}%`);
  if (medidas.length > 0) lines.push(`\n--- ÚLTIMA AVALIAÇÃO ---`, ...medidas);

  return lines;
}

export function formatContextForPrompt(ctx: StudentContext): string {
  const lines: string[] = [];

  if (ctx.health === null) {
    // O especialista precisa saber que o silêncio é falta de base legal, não
    // aluno sem histórico — senão ele prescreve achando que não há restrição.
    lines.push(
      "--- HISTÓRICO DE SAÚDE ---",
      "INDISPONÍVEL: o aluno não deu consentimento para uso dos dados de saúde.",
      "Não afirme que ele não tem lesão ou restrição — você não sabe.",
      "Avise o especialista e conduza a conversa apenas por estrutura e volume.",
    );
  } else {
    const dados = healthLines(ctx.health);
    lines.push("--- PERFIL E ANAMNESE ---");
    lines.push(...(dados.length > 0 ? dados : ["Anamnese ainda não preenchida."]));
  }

  lines.push("\n--- PERIODIZAÇÕES EXISTENTES ---");
  if (ctx.periodizations.length > 0) {
    for (const p of ctx.periodizations) {
      lines.push(`• ${p.name} (${p.goal}) — Status: ${p.status}`);
      if (p.phases.length > 0) {
        for (const ph of p.phases) {
          lines.push(`  - ${ph.name}: ${ph.weeks} semanas — ${ph.focus}`);
        }
      } else {
        lines.push("  (sem fases definidas)");
      }
    }
  } else {
    lines.push("Nenhuma periodização criada ainda.");
  }

  return lines.join("\n");
}
