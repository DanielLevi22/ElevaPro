import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { StudentCoachOrchestrator } from "@/modules/ai/orchestrators/student-coach.orchestrator";
import {
  formatStudentCoachContext,
  loadStudentCoachContext,
} from "@/modules/ai/services/studentCoachContextLoader";
import {
  getOrCreateStudentCoachSession,
  getStudentSessionMessages,
  saveStudentCoachPlan,
  saveStudentMessage,
} from "@/modules/ai/services/studentCoachService";
import type { PlanProposalData, SseEvent } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;
  const studentId = auth.caller.id;

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
        const ctx = await loadStudentCoachContext(studentId);

        const sessionId = await getOrCreateStudentCoachSession(studentId);
        const storedMessages = await getStudentSessionMessages(sessionId);

        const history = storedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const contextText = formatStudentCoachContext(ctx);

        await saveStudentMessage(sessionId, "user", userMessage);

        const orchestrator = new StudentCoachOrchestrator(
          aiProviders.reasoning,
          ctx.coachMode,
          ctx.personaTrack,
        );

        let assistantFullText = "";
        let savedPlanId: string | undefined;

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          if (name === "save_plan") {
            try {
              const plan = input as PlanProposalData;
              const planId = await saveStudentCoachPlan(studentId, plan.workout, plan.nutrition);
              savedPlanId = planId;
              return JSON.stringify({ success: true, plan_id: planId });
            } catch (err) {
              return JSON.stringify({ error: String(err) });
            }
          }
          return JSON.stringify({ error: "unknown tool" });
        };

        for await (const event of orchestrator.run({
          userMessage,
          history,
          contextText,
          onToolCall,
        })) {
          if (event.type === "text") {
            assistantFullText += event.content;
          }
          controller.enqueue(sseChunk(event));
        }

        if (assistantFullText.trim()) {
          await saveStudentMessage(
            sessionId,
            "assistant",
            assistantFullText,
            savedPlanId ? { saved_plan_id: savedPlanId } : undefined,
          );
        }
      } catch (err) {
        controller.enqueue(
          sseChunk({ type: "error", message: err instanceof Error ? err.message : String(err) }),
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
