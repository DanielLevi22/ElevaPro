import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { NutritionOrchestrator } from "@/modules/ai/orchestrators/nutrition.orchestrator";
import { formatBodyScanIndex, queryBodyScan } from "@/modules/ai/services/bodyScanContext";
import {
  getOrCreateSession,
  getSessionMessages,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { formatContextForPrompt, loadStudentContext } from "@/modules/ai/services/contextLoader";
import { definirTituloProvisorio, nomearConversa } from "@/modules/ai/services/conversationTitle";
import { queryFoods, unknownFoodNames } from "@/modules/ai/services/foodCatalog";
import type { DietMealsProposal, DietPlanProposal, SseEvent } from "@/modules/ai/types";

/** Linha em branco entre os blocos do contexto. */
const SECTION_SEPARATOR = `

`;

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

const MODULE = "nutrition" as const;

/**
 * Qual conversa esta requisição usa.
 *
 * Com `sessionId`, valida o dono antes de tocar em qualquer coisa: o id vem do
 * cliente e esta rota usa `service_role`, que não consulta RLS. Sem `sessionId`,
 * o comportamento antigo é preservado — retoma a mais recente.
 *
 * `null` significa "essa conversa não é sua": o chamador responde 404 sem
 * confirmar nem desmentir que o id existe.
 */
async function resolverSessao(
  sessionId: string | undefined,
  studentId: string,
  specialistId: string,
  modulo: "workout" | "nutrition" | "general",
): Promise<string | null> {
  if (sessionId) return sessionOwnedBy(sessionId, studentId, specialistId);
  return getOrCreateSession(studentId, specialistId, modulo);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  // Vínculo ativo antes de tudo: abaixo roda `service_role`, que não consulta
  // RLS. É a mesma barreira auditada no PR #99.
  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  const body = await request.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const userMessage: string = body.message;
  const encoder = new TextEncoder();
  const sseChunk = (event: SseEvent) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const [sessionId, studentCtx] = await Promise.all([
          resolverSessao(body.sessionId, studentId, specialistId, MODULE),
          // Verifica `student_consents` antes de ler dado de saúde, e não
          // devolve o nome do titular. Plano alimentar é dado sensível
          // (Art. 11, II, f + I) — ver LGPD_COMPLIANCE, seção 10.
          loadStudentContext(studentId, specialistId),
        ]);

        // Conversa que não é deste aluno com este especialista não existe para
        // quem perguntou. Encerrar aqui evita que o restante do stream trabalhe
        // com uma sessão nula — e o tipo obriga a decidir, em vez de deixar
        // passar com `!`.
        if (!sessionId) {
          controller.enqueue(sseChunk({ type: "error", message: "conversa não encontrada" }));
          controller.close();
          return;
        }

        const storedMessages = await getSessionMessages(sessionId);
        const history = storedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Só o índice, não o conteúdo: o contexto vai em todo turno, e a
        // análise inteira encareceria a conversa por um dado que a maioria dos
        // turnos não usa. O detalhe vem por `query_body_scan` (ADR-010).
        // Falha aqui não derruba o chat — o coach só deixa de saber que existe.
        const bodyScanIndex = await formatBodyScanIndex(studentId).catch(() => "");

        const contextText = [formatContextForPrompt(studentCtx), bodyScanIndex]
          .filter(Boolean)
          .join(SECTION_SEPARATOR);
        const primeiraTroca = storedMessages.length === 0;

        await saveMessage(sessionId, "user", userMessage);
        if (primeiraTroca) {
          await definirTituloProvisorio(sessionId, userMessage).catch(() => {});
        }

        let assistantFullText = "";

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          const typed = input as Record<string, unknown>;

          if (name === "query_foods") {
            const result = await queryFoods({
              search_term: typeof typed.search_term === "string" ? typed.search_term : undefined,
            });
            return JSON.stringify(result);
          }

          if (name === "propose_diet_plan") {
            const plan = typed as unknown as DietPlanProposal;
            await updateSessionState(sessionId, { pendingDietPlan: plan });
            controller.enqueue(sseChunk({ type: "diet_plan_proposal", data: plan }));
            return JSON.stringify({ success: true, aguardando: "aprovação do especialista" });
          }

          if (name === "propose_meals") {
            const meals = (typed.meals ?? []) as DietMealsProposal["meals"];

            // `diet_meal_items.food_id` é NOT NULL com ON DELETE restrict: não
            // existe item em texto livre. Recusar aqui evita o plano salvo pela
            // metade, com o especialista aprovando cinco alimentos e recebendo
            // três.
            const nomes = meals.flatMap((m) => m.items.map((i) => i.food_name));
            const desconhecidos = await unknownFoodNames(nomes);
            if (desconhecidos.length > 0) {
              return JSON.stringify({
                error: "Alguns alimentos não existem no catálogo.",
                nao_encontrados: desconhecidos,
                instrucao: "Use 'query_foods' e refaça a proposta com os nomes exatos.",
              });
            }

            const proposal: DietMealsProposal = {
              plan_name: (typed.plan_name as string) ?? "",
              plan_type: meals.some((m) => m.day_of_week !== undefined) ? "cyclic" : "unique",
              meals,
            };

            await updateSessionState(sessionId, { pendingDietMeals: proposal });
            controller.enqueue(sseChunk({ type: "diet_meals_proposal", data: proposal }));
            return JSON.stringify({ success: true, aguardando: "aprovação do especialista" });
          }

          if (name === "query_body_scan") {
            return queryBodyScan(studentId);
          }

          return JSON.stringify({ error: "unknown tool" });
        };

        const orchestrator = new NutritionOrchestrator(aiProviders.reasoning);
        for await (const event of orchestrator.run({
          userMessage,
          history,
          contextText,
          onToolCall,
        })) {
          if (event.type === "text") assistantFullText += event.content;
          controller.enqueue(sseChunk(event));
        }

        if (assistantFullText.trim()) {
          await saveMessage(sessionId, "assistant", assistantFullText);

          // Depois do stream, nunca durante.
          if (primeiraTroca) await nomearConversa(sessionId, userMessage, assistantFullText);
        }
      } catch (err) {
        // O log registra a sessão, nunca o contexto: alimento e quantidade
        // dizem muito sobre a pessoa (LGPD_COMPLIANCE, seção 4).
        console.error("[POST /api/ai/nutrition/chat] especialista", specialistId, err);
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

  // Com `?sessionId=`, carrega aquela conversa — validando o dono, porque o id
  // vem do cliente e esta rota usa `service_role`. Sem ele, retoma a mais
  // recente, que é o comportamento de antes.
  //
  // O POST já aceitava `sessionId` e o GET não: clicar numa conversa antiga de
  // nutrição abriria a mais recente e escreveria na antiga. Duas conversas
  // diferentes na mesma tela é pior que uma só.
  const pedida = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  const sessionId = await resolverSessao(pedida, studentId, auth.caller.id, MODULE);

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }

  const messages = await getSessionMessages(sessionId);

  return NextResponse.json({ sessionId, messages });
}
