import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aprovarProposta } from "@/modules/ai/services/aprovacaoDaProposta";
import {
  getOrCreateSession,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import type { DietPlanProposal } from "@/modules/ai/types";

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
const handler = async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  // A proposta guardada vive no `state` da conversa que a produziu. Sem o
  // `sessionId` do cliente esta rota pegava a mais recente do módulo — e
  // aprovar numa conversa que não fosse a última respondia "nenhuma proposta
  // pendente" com a proposta na tela. O dono é validado porque o id vem do
  // cliente e o `service_role` abaixo não consulta RLS.
  const corpo = await request.json().catch(() => null);
  const pedida = typeof corpo?.sessionId === "string" ? corpo.sessionId : undefined;

  const sessionId = pedida
    ? await sessionOwnedBy(pedida, studentId, specialistId)
    : await getOrCreateSession(studentId, specialistId, "nutrition");

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }
  // A proposta é reivindicada, não lida: quem chega primeiro a recebe, quem
  // chega depois recebe nada. Era essa janela que deixava duas abas — ou um
  // retry depois do tempo — gravarem o mesmo plano duas vezes.
  //
  // Aqui é um insert só, então o desfazer nunca tem o que apagar: ou a linha
  // entrou e a gravação deu certo, ou ela não entrou.
  let aprovado: DietPlanProposal | undefined;

  let salvo: { id: string } | null;
  try {
    salvo = await aprovarProposta<DietPlanProposal, { id: string }>(sessionId, "pendingDietPlan", {
      gravar: async (plan) => {
        aprovado = plan;
        const { data, error } = await supabaseAdmin
          .from("diet_plans")
          .insert({
            student_id: studentId,
            specialist_id: specialistId,
            name: plan.name,
            plan_type: plan.plan_type,
            status: "active",
            // Período obrigatório: `DietDetailsHeader` formata estas datas, e
            // o `format` do date-fns lança com data inválida.
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

        if (error || !data) throw new Error(error?.message ?? "insert de diet_plans não retornou");
        return { id: data.id };
      },
      desfazer: async () => {},
    });
  } catch (err) {
    console.error("[POST save-plan] especialista", specialistId, err);
    return NextResponse.json({ error: "Não consegui salvar o plano." }, { status: 500 });
  }

  if (!salvo || !aprovado) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }
  const plan = aprovado;

  // Sai da fila de decisão e vira histórico da tela: sumir de vez deixava a
  // conversa anunciando o plano salvo com a tela sem nada para mostrar ao
  // reabrir.
  await updateSessionState(sessionId, {
    savedDietPlanId: salvo.id,
    resolvedDietPlan: plan,
  });

  // A aprovação acontece no cartão, fora da conversa. Sem esta linha o coach
  // pede aprovação de novo no turno seguinte.
  await saveMessage(
    sessionId,
    "assistant",
    `✅ Plano alimentar aprovado e salvo: ${plan.name} (${plan.target_calories} kcal/dia).`,
  );

  return NextResponse.json({ id: salvo.id, name: plan.name });
};

export const POST = rotaDeIA(handler);
