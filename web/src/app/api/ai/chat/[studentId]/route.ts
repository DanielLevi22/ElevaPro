import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import {
  getOrCreateSession,
  getSessionMessages,
  saveMessage,
  savePeriodization,
} from "@/modules/ai/services/chatService";
import { formatContextForPrompt, loadStudentContext } from "@/modules/ai/services/contextLoader";
import { queryExercises } from "@/modules/ai/services/exerciseCatalog";
import { runWorkoutOrchestrator } from "@/modules/ai/services/workoutOrchestrator";
import type { SseEvent } from "@/modules/ai/types";

async function handleQueryExercises(input: Record<string, unknown>): Promise<string> {
  const result = await queryExercises({
    muscle_group: typeof input.muscle_group === "string" ? input.muscle_group : undefined,
    search_term: typeof input.search_term === "string" ? input.search_term : undefined,
  });

  if (result.unknownGroup) {
    return JSON.stringify({
      exercises: [],
      erro: `Grupo "${result.unknownGroup.requested}" não existe no catálogo.`,
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
