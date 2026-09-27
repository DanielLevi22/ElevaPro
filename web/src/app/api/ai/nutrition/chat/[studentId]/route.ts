import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { aiProviders } from "@/modules/ai/ai.config";
import { NutritionOrchestrator } from "@/modules/ai/orchestrators/nutrition.orchestrator";
import { formatBodyScanIndex, queryBodyScan } from "@/modules/ai/services/bodyScanContext";
import {
  getSessionMessages,
  getSessionState,
  saveMessage,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { formatContextForPrompt, loadStudentContext } from "@/modules/ai/services/contextLoader";
import { definirTituloProvisorio, nomearConversa } from "@/modules/ai/services/conversationTitle";
import { queryFoods, unknownFoodNames } from "@/modules/ai/services/foodCatalog";
import { historicoDoTurno } from "@/modules/ai/services/historicoDoTurno";
import { mensagemDeFalha } from "@/modules/ai/services/mensagemDeFalha";
import {
  NutritionChatError,
  nutritionDraftPrompt,
  resolveNutritionChat,
} from "@/modules/ai/services/nutritionDraftChat";
import { criarRespostaEmProgresso } from "@/modules/ai/services/respostaEmProgresso";
import type { DietMealsProposal, DietPlanProposal, SseEvent } from "@/modules/ai/types";

/** Linha em branco entre os blocos do contexto. */
const SECTION_SEPARATOR = `

`;

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

function scopeFailure(error: unknown) {
  return NextResponse.json(
    {
      code: error instanceof NutritionChatError ? error.code : undefined,
      error:
        error instanceof NutritionChatError ? error.message : "Não foi possível abrir a conversa.",
    },
    { status: error instanceof NutritionChatError ? error.status : 503 },
  );
}

async function handlePost(
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
  if (typeof body?.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let scope: Awaited<ReturnType<typeof resolveNutritionChat>>;
  try {
    scope = await resolveNutritionChat({
      studentId,
      specialistId,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      planId: typeof body.planId === "string" ? body.planId : undefined,
      intent: "conversation",
    });
  } catch (error) {
    return scopeFailure(error);
  }

  const userMessage: string = body.message;
  const encoder = new TextEncoder();
  const sseChunk = (event: SseEvent) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  // Fora do `start` para o `cancel` alcançar: quem fecha a aba no meio do turno
  // cancela o stream, e é aqui que o texto já dito é preservado.
  let resposta: ReturnType<typeof criarRespostaEmProgresso> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sessionId = scope.id;
        // O carregador continua verificando consentimento e omitindo o nome do titular.
        const studentCtx = await loadStudentContext(
          studentId,
          specialistId,
          scope.draft?.id ?? scope.closedPlanId,
        );

        const storedMessages = await getSessionMessages(sessionId);
        const history = historicoDoTurno(storedMessages);

        // Só o índice, não o conteúdo: o contexto vai em todo turno, e a
        // análise inteira encareceria a conversa por um dado que a maioria dos
        // turnos não usa. O detalhe vem por `query_body_scan` (ADR-0010).
        // Falha aqui não derruba o chat — o coach só deixa de saber que existe.
        const bodyScanIndex = await formatBodyScanIndex(studentId).catch(() => "");

        const contextText = [
          formatContextForPrompt(studentCtx),
          bodyScanIndex,
          scope.draft ? nutritionDraftPrompt(scope.draft) : "",
          scope.closedPlanId
            ? "Esta conversa pertence a uma prescrição já enviada. Pode discutir o plano, mas não propor nem gravar mudanças. Para ajustar, peça ao especialista que abra uma nova versão em rascunho."
            : "",
        ]
          .filter(Boolean)
          .join(SECTION_SEPARATOR);
        const primeiraTroca = storedMessages.length === 0;

        await saveMessage(sessionId, "user", userMessage);
        if (primeiraTroca) {
          await definirTituloProvisorio(sessionId, userMessage).catch(() => {});
        }

        // A resposta é gravada enquanto chega: só no fim, um corte aos 60s da
        // Vercel levava o turno inteiro, e lá o processo é encerrado sem
        // `catch` nenhum para socorrer.
        resposta = criarRespostaEmProgresso(sessionId);

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          const typed = input as Record<string, unknown>;
          if (scope.closedPlanId && (name === "propose_diet_plan" || name === "propose_meals")) {
            return JSON.stringify({
              error: "Plano enviado: abra uma nova versão em rascunho para propor alterações.",
            });
          }

          if (name === "query_foods") {
            const result = await queryFoods(
              {
                search_term: typeof typed.search_term === "string" ? typed.search_term : undefined,
                category: typeof typed.category === "string" ? typed.category : undefined,
              },
              specialistId,
            );

            if (result.unknownCategory) {
              return JSON.stringify({
                foods: [],
                erro: `Não conheço a categoria "${result.unknownCategory.requested}".`,
                categorias_disponiveis: result.unknownCategory.available,
              });
            }

            return JSON.stringify(result);
          }

          if (name === "propose_diet_plan") {
            if (scope.draft)
              return JSON.stringify({
                error: "O rascunho já existe. Use propose_meals para adicionar refeições nele.",
              });
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
            const desconhecidos = await unknownFoodNames(nomes, specialistId);
            if (desconhecidos.length > 0) {
              return JSON.stringify({
                error: "Alguns alimentos não existem no catálogo.",
                nao_encontrados: desconhecidos,
                instrucao: "Use 'query_foods' e refaça a proposta com os nomes exatos.",
              });
            }

            const proposal: DietMealsProposal = {
              plan_name: (typed.plan_name as string) ?? "",
              plan_type: meals.some((m) => m.day_of_week != null) ? "cyclic" : "unique",
              meals,
            };

            if (scope.draft && proposal.plan_type !== scope.draft.plan_type) {
              return JSON.stringify({
                error:
                  "O tipo das refeições deve corresponder ao rascunho aberto. Na dieta cíclica, informe day_of_week de 0 a 6.",
              });
            }

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
          if (event.type === "text") resposta.empurrar(event.content);
          controller.enqueue(sseChunk(event));
        }

        await resposta.concluir();

        // Depois do stream, nunca durante.
        if (resposta.texto.trim() && primeiraTroca) {
          await nomearConversa(sessionId, userMessage, resposta.texto);
        }
      } catch (err) {
        // O log registra a sessão, nunca o contexto: alimento e quantidade
        // dizem muito sobre a pessoa (LGPD_COMPLIANCE, seção 4).
        logger.error("ai.nutrition_chat.stream_failed", { error: err });
        // O que o modelo chegou a dizer antes de quebrar fica na conversa,
        // marcado como incompleto — descartar deixava a pergunta salva com
        // silêncio embaixo.
        await resposta?.interromper().catch(() => {});
        controller.enqueue(
          sseChunk({
            type: "error",
            message: mensagemDeFalha(err),
          }),
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

async function handleGet(
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

  let scope: Awaited<ReturnType<typeof resolveNutritionChat>>;
  try {
    scope = await resolveNutritionChat({
      studentId,
      specialistId: auth.caller.id,
      sessionId: pedida,
      planId: request.nextUrl.searchParams.get("planId") ?? undefined,
      fresh: request.nextUrl.searchParams.get("new") === "1",
      intent: "conversation",
    });
  } catch (error) {
    return scopeFailure(error);
  }
  const sessionId = scope.id;

  const [messages, estado] = await Promise.all([
    getSessionMessages(sessionId),
    getSessionState(sessionId),
  ]);

  // Mesmo motivo do chat de treino: a proposta guardada é a que a aprovação
  // salva, e sem devolvê-la recarregar a tela apagava o cartão com o botão.
  //
  // A pendente vem primeiro — havendo decisão a tomar, é ela que a tela precisa
  // mostrar. Sem pendente, volta a aprovada, marcada como salva.
  return NextResponse.json({
    sessionId,
    savedPlanId: estado.savedDietPlanId ?? null,
    readOnly: !!scope.closedPlanId,
    messages,
    planProposal: scope.closedPlanId
      ? (estado.resolvedDietPlan ?? null)
      : (estado.pendingDietPlan ?? estado.resolvedDietPlan ?? null),
    planSaved: scope.closedPlanId
      ? true
      : !estado.pendingDietPlan && Boolean(estado.resolvedDietPlan),
    mealsProposal: scope.closedPlanId
      ? (estado.resolvedDietMeals ?? null)
      : (estado.pendingDietMeals ?? estado.resolvedDietMeals ?? null),
    mealsSaved: scope.closedPlanId
      ? true
      : !estado.pendingDietMeals && Boolean(estado.resolvedDietMeals),
  });
}

export const POST = withAiRoute(handlePost);
export const GET = withAiRoute(handleGet);
