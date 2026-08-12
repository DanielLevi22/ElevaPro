import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  updateSessionState,
} from "@/modules/ai/services/chatService";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

const DIA_MS = 86_400_000;

function somaSemanas(isoDate: string, weeks: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`).getTime();
  return new Date(base + weeks * 7 * DIA_MS).toISOString().slice(0, 10);
}

/**
 * Grava o plano alimentar a partir da proposta guardada no servidor.
 *
 * Salva a cópia guardada, não o que o modelo reemitir — é o que garante que o
 * gravado é idêntico ao que o especialista aprovou olhando o cartão.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  const sessionId = await getOrCreateSession(studentId, specialistId, "nutrition");
  const state = await getSessionState(sessionId);
  const plan = state.pendingDietPlan;

  if (!plan) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("diet_plans")
    .insert({
      student_id: studentId,
      specialist_id: specialistId,
      name: plan.name,
      plan_type: plan.plan_type,
      status: "active",
      // Período obrigatório: `DietDetailsHeader` formata estas datas, e o
      // `format` do date-fns lança com data inválida.
      start_date: plan.start_date,
      end_date: somaSemanas(plan.start_date, plan.duration_weeks),
      target_calories: plan.target_calories,
      target_protein: plan.target_protein,
      target_carbs: plan.target_carbs,
      target_fat: plan.target_fat,
      notes: plan.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[POST save-plan] especialista", specialistId, error);
    return NextResponse.json({ error: "Não consegui salvar o plano." }, { status: 500 });
  }

  await updateSessionState(sessionId, {
    savedDietPlanId: data.id,
    pendingDietPlan: undefined,
  });

  // A aprovação acontece no cartão, fora da conversa. Sem esta linha o coach
  // pede aprovação de novo no turno seguinte.
  await saveMessage(
    sessionId,
    "assistant",
    `✅ Plano alimentar aprovado e salvo: ${plan.name} (${plan.target_calories} kcal/dia).`,
  );

  return NextResponse.json({ id: data.id, name: plan.name });
}
