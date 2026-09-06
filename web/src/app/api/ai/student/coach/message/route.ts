import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { StudentCoachOrchestrator } from "@/modules/ai/orchestrators/student-coach.orchestrator";
import { updateMessage, updateSessionState } from "@/modules/ai/services/chatService";
import { historicoDoTurno } from "@/modules/ai/services/historicoDoTurno";
import { criarRespostaEmProgresso } from "@/modules/ai/services/respostaEmProgresso";
import {
  formatStudentCoachContext,
  loadStudentCoachContext,
} from "@/modules/ai/services/studentCoachContextLoader";
import {
  getOrCreateStudentCoachSession,
  getStudentSessionMessages,
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

  // Fora do `start` para o `cancel` alcançar: quem fecha a aba no meio do turno
  // cancela o stream, e é aqui que o texto já dito é preservado.
  let resposta: ReturnType<typeof criarRespostaEmProgresso> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ctx = await loadStudentCoachContext(studentId);

        const sessionId = await getOrCreateStudentCoachSession(studentId);
        const storedMessages = await getStudentSessionMessages(sessionId);

        const history = historicoDoTurno(storedMessages);

        const contextText = formatStudentCoachContext(ctx);

        await saveStudentMessage(sessionId, "user", userMessage);

        const orchestrator = new StudentCoachOrchestrator(
          aiProviders.reasoning,
          ctx.coachMode,
          ctx.personaTrack,
        );

        // A resposta é gravada enquanto chega: só no fim, um corte aos 60s da
        // Vercel levava o turno inteiro, e lá o processo é encerrado sem
        // `catch` nenhum para socorrer.
        resposta = criarRespostaEmProgresso(sessionId, {
          salvar: saveStudentMessage,
          atualizar: updateMessage,
          agora: Date.now,
        });
        let savedPlanId: string | undefined;

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          if (name === "propose_plan") {
            // Guardada antes de aparecer na tela: é esta cópia que a aprovação
            // salva. Salvar o que o modelo reemite no turno seguinte deixava o
            // plano gravado divergir do que o aluno aprovou olhando o cartão.
            const plano = input as PlanProposalData;
            await updateSessionState(sessionId, { pendingStudentPlan: plano });
            controller.enqueue(sseChunk({ type: "plan_proposal", data: plano }));
            return "Plano apresentado ao aluno. Aguardando confirmação.";
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
            resposta.empurrar(event.content);
          }
          controller.enqueue(sseChunk(event));
        }

        await resposta.concluir(savedPlanId ? { saved_plan_id: savedPlanId } : undefined);
      } catch (err) {
        // O que o coach chegou a dizer antes de quebrar fica na conversa,
        // marcado como incompleto.
        await resposta?.interromper().catch(() => {});
        controller.enqueue(
          sseChunk({ type: "error", message: err instanceof Error ? err.message : String(err) }),
        );
      } finally {
        controller.close();
      }
    },

    // Fechou a aba, perdeu a rede: o turno para no meio e o que já foi dito
    // continua sendo o que aconteceu.
    async cancel() {
      await resposta?.interromper().catch(() => {});
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
