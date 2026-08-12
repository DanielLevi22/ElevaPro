import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import {
  getOrCreateSession,
  getSessionMessages,
  phaseOwnedBy,
  saveMessage,
  savePeriodization,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { formatContextForPrompt, loadStudentContext } from "@/modules/ai/services/contextLoader";
import { queryExercises, unknownExerciseNames } from "@/modules/ai/services/exerciseCatalog";
import { runWorkoutOrchestrator } from "@/modules/ai/services/workoutOrchestrator";
import type { BulkWorkoutItem, SseEvent } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

async function handleQueryExercises(input: Record<string, unknown>): Promise<string> {
  const result = await queryExercises({
    muscle_groups: Array.isArray(input.muscle_groups)
      ? (input.muscle_groups as string[])
      : undefined,
    search_term: typeof input.search_term === "string" ? input.search_term : undefined,
  });

  if (result.unknownGroup) {
    return JSON.stringify({
      exercises: [],
      erro: `Não conheço: ${result.unknownGroup.requested.join(", ")}.`,
      grupos_disponiveis: result.unknownGroup.available,
    });
  }

  return JSON.stringify(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  // `studentId` vem da URL e `loadStudentContext` lê anamnese e avaliação
  // física pelo `service_role`, que não consulta RLS. Sem esta linha, qualquer
  // conta autenticada recebe o dado de saúde de qualquer aluno na resposta do
  // modelo — verificado em 2026-08-11.
  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  const body = await request.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const userMessage: string = body.message;

  const encoder = new TextEncoder();

  function sseChunk(event: SseEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const [sessionId, studentCtx] = await Promise.all([
          getOrCreateSession(studentId, specialistId, "workout"),
          loadStudentContext(studentId, specialistId),
        ]);

        const storedMessages = await getSessionMessages(sessionId);
        const history = storedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const contextText = formatContextForPrompt(studentCtx);

        await saveMessage(sessionId, "user", userMessage);

        let assistantFullText = "";
        let savedPeriodizationId: string | undefined;

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          const typedInput = input as Record<string, unknown>;

          if (name === "save_periodization") {
            try {
              const periodId = await savePeriodization(studentId, specialistId, {
                name: typedInput.name as string,
                goal: typedInput.goal as string,
                durationWeeks: typedInput.durationWeeks as number,
                startDate: typedInput.startDate as string,
                level: typedInput.level as string,
                phases: typedInput.phases as { name: string; weeks: number; focus: string }[],
              });
              savedPeriodizationId = periodId;
              controller.enqueue(
                sseChunk({
                  type: "saved",
                  entity: "periodization",
                  id: periodId,
                  name: typedInput.name as string,
                }),
              );
              return JSON.stringify({ success: true, periodization_id: periodId });
            } catch (err) {
              return JSON.stringify({ error: String(err) });
            }
          }

          if (name === "propose_workouts") {
            // A proposta fica guardada no servidor e a aprovação salva a cópia
            // guardada. Se o modelo tivesse que reemitir tudo num segundo
            // tool call, uma proposta de 4 treinos × 6 exercícios teria espaço
            // de sobra para divergir entre o que foi mostrado e o que foi
            // salvo — e quem aprova é o especialista, olhando o cartão.
            const proposal = {
              phase_id: typedInput.phase_id as string,
              phase_name: typedInput.phase_name as string,
              workouts: (typedInput.workouts ?? []) as BulkWorkoutItem[],
            };

            // A fase vem do modelo, então é entrada não confiável: precisa ser
            // uma fase deste aluno com este especialista. Sem a checagem, um id
            // alucinado grava treino na fase de outra pessoa — a rota de salvar
            // usa `service_role`, que não consulta RLS.
            const fase = await phaseOwnedBy(proposal.phase_id, studentId, specialistId);
            if (!fase) {
              return JSON.stringify({
                error: "phase_id não é uma fase deste aluno.",
                instrucao:
                  "Use o id que aparece entre colchetes em PERIODIZAÇÕES EXISTENTES, no formato uuid.",
              });
            }

            const nomes = proposal.workouts.flatMap((w) =>
              (w.exercises ?? []).map((e) => e.exercise_name),
            );
            const desconhecidos = await unknownExerciseNames(nomes);
            if (desconhecidos.length > 0) {
              // Devolver o problema ao modelo em vez de gravar pela metade: o
              // `saveExercises` descarta em silêncio o que não casa, então o
              // especialista aprovaria 6 exercícios e receberia 4.
              return JSON.stringify({
                error: "Alguns exercícios não existem no catálogo.",
                nao_encontrados: desconhecidos,
                instrucao:
                  "Use 'query_exercises' e refaça a proposta com os nomes exatos do catálogo.",
              });
            }

            await updateSessionState(sessionId, { pendingWorkoutProposal: proposal });
            controller.enqueue(sseChunk({ type: "workout_proposal", data: proposal }));
            return JSON.stringify({ success: true, aguardando: "aprovação do especialista" });
          }

          if (name === "query_exercises") {
            return handleQueryExercises(typedInput);
          }

          return JSON.stringify({ error: "unknown tool" });
        };

        const generator = runWorkoutOrchestrator(userMessage, history, contextText, onToolCall);

        for await (const event of generator) {
          if (event.type === "text") {
            assistantFullText += event.content;
          }
          controller.enqueue(sseChunk(event));
        }

        if (assistantFullText.trim()) {
          await saveMessage(
            sessionId,
            "assistant",
            assistantFullText,
            savedPeriodizationId ? { saved_periodization_id: savedPeriodizationId } : undefined,
          );
        }
      } catch (err) {
        // O técnico vai para o log, o humano para a tela. Antes a bolha do chat
        // recebia o `message` cru — e um objeto de erro do PostgREST virava
        // literalmente "[object Object]" na conversa.
        //
        // O log registra a sessão, nunca o contexto: "não treina há 5 dias" ou
        // uma lesão em texto claro é inferência sobre saúde de titular
        // identificado (LGPD_COMPLIANCE, seção 4).
        console.error("[POST /api/ai/chat] sessão do especialista", specialistId, err);
        controller.enqueue(
          sseChunk({
            type: "error",
            message: "Não consegui responder agora. Tente de novo em instantes.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;

  const sessionId = await getOrCreateSession(studentId, auth.caller.id, "workout");
  const messages = await getSessionMessages(sessionId);

  return NextResponse.json({ sessionId, messages });
}
