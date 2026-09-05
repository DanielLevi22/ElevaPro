import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aprovarProposta } from "@/modules/ai/services/aprovacaoDaProposta";
import {
  getOrCreateSession,
  saveMessage,
  savePeriodization,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import type { PeriodizationProposal } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

/**
 * Apaga a periodização que esta chamada chegou a criar.
 *
 * `training_plans` tem `ON DELETE CASCADE` a partir de `training_periodizations`,
 * então apagar a periodização leva as fases junto.
 */
async function apagarPeriodizacao(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from("training_periodizations").delete().in("id", ids);
  if (error) throw new Error(`falha ao desfazer a periodização: ${error.message}`);
}

/**
 * Grava a periodização a partir da proposta guardada no servidor.
 *
 * Antes a aprovação era uma frase no chat — `"Aprovado! Pode salvar"` — e o
 * modelo é que deveria chamar `save_periodization`. Só que o histórico que ele
 * relê tem apenas texto: chamada de ferramenta e resultado não são gravados.
 * Ele chegava ao turno seguinte sem nome, semanas, data nem fases, propunha de
 * novo para reconstruí-los, a rota respondia "aguardando aprovação", e ele
 * pedia que se aprovasse outra vez. Sem fim.
 *
 * Aqui o que é gravado é a cópia que o especialista revisou no cartão.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  // `studentId` vem da URL: sem a checagem de vínculo, esta rota grava
  // prescrição na conta de qualquer aluno. O `service_role` abaixo não consulta
  // RLS — a barreira é esta linha.
  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  const corpo = await request.json().catch(() => null);
  const pedida = typeof corpo?.sessionId === "string" ? corpo.sessionId : undefined;

  const sessionId = pedida
    ? await sessionOwnedBy(pedida, studentId, specialistId)
    : await getOrCreateSession(studentId, specialistId, "workout");

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }

  const criadas: string[] = [];
  let aprovada: PeriodizationProposal | undefined;

  let salva: { id: string } | null;
  try {
    salva = await aprovarProposta<PeriodizationProposal, { id: string }>(
      sessionId,
      "pendingPeriodization",
      {
        gravar: async (proposal) => {
          aprovada = proposal;
          const id = await savePeriodization(studentId, specialistId, proposal);
          criadas.push(id);
          return { id };
        },
        desfazer: () => apagarPeriodizacao(criadas),
      },
    );
  } catch (err) {
    console.error("[POST save-periodization] especialista", specialistId, err);
    return NextResponse.json({ error: "Não consegui salvar a periodização." }, { status: 500 });
  }

  if (!salva || !aprovada) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }

  // Sai da fila de decisão e vira histórico da tela. A chave pendente já saiu
  // do `state` na reivindicação; o que falta é o registro do que foi aprovado,
  // para o cartão reabrir marcado como salvo em vez de pedir aprovação de novo.
  await updateSessionState(sessionId, {
    resolvedPeriodization: { proposal: aprovada, id: salva.id },
  });

  // A aprovação acontece no cartão, fora da conversa. Sem esta linha o
  // histórico não registra nada, e no turno seguinte o assistente pede
  // aprovação de novo — de uma periodização que acabou de ser salva.
  await saveMessage(
    sessionId,
    "assistant",
    `✅ Periodização aprovada e salva: ${aprovada.name} (${aprovada.durationWeeks} semanas, ${aprovada.phases.length} fases). Podemos montar os treinos da primeira fase.`,
  );

  return NextResponse.json({ id: salva.id, name: aprovada.name });
}
