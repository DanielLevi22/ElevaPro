import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { formatBodyScanIndex, queryBodyScan } from "@/modules/ai/services/bodyScanContext";
import {
  getOrCreateSession,
  getSessionMessages,
  getSessionState,
  phaseOwnedBy,
  saveMessage,
  savePeriodization,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { formatContextForPrompt, loadStudentContext } from "@/modules/ai/services/contextLoader";
import { definirTituloProvisorio, nomearConversa } from "@/modules/ai/services/conversationTitle";
import { resumirDisponibilidade } from "@/modules/ai/services/disponibilidade";
import { queryExercises, unknownExerciseNames } from "@/modules/ai/services/exerciseCatalog";
import { runWorkoutOrchestrator } from "@/modules/ai/services/workoutOrchestrator";
import type { BulkWorkoutItem, PeriodizationProposal, SseEvent } from "@/modules/ai/types";

/** Linha em branco entre os blocos do contexto. */
const SECTION_SEPARATOR = `

`;

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

async function handleQueryExercises(input: Record<string, unknown>): Promise<string> {
  const texto = (campo: unknown): string | undefined =>
    typeof campo === "string" ? campo : undefined;

  const result = await queryExercises({
    muscle_groups: Array.isArray(input.muscle_groups)
      ? (input.muscle_groups as string[])
      : undefined,
    search_term: texto(input.search_term),
    venue: texto(input.venue),
    category: texto(input.category),
  });

  if (result.unknownGroup) {
    return JSON.stringify({
      exercises: [],
      erro: `Não conheço: ${result.unknownGroup.requested.join(", ")}.`,
      grupos_disponiveis: result.unknownGroup.available,
    });
  }

  if (result.unknownFilter) {
    return JSON.stringify({
      exercises: [],
      erro: `Não conheço ${result.unknownFilter.field} "${result.unknownFilter.requested}".`,
      valores_disponiveis: result.unknownFilter.available,
    });
  }

  return JSON.stringify(result);
}

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
          resolverSessao(body.sessionId, studentId, specialistId, "workout"),
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
        // turnos não usa. O detalhe vem por `query_body_scan` (ADR-0010).
        // Falha aqui não derruba o chat — o coach só deixa de saber que existe.
        const bodyScanIndex = await formatBodyScanIndex(studentId).catch(() => "");

        const contextText = [formatContextForPrompt(studentCtx), bodyScanIndex]
          .filter(Boolean)
          .join(SECTION_SEPARATOR);

        // Conversa sem mensagem nenhuma e conversa nova sao a mesma coisa, e e
        // a unica vez que o titulo automatico age: depois disso, o que estiver
        // ali foi escolhido -- pelo gerador ou pela pessoa -- e nao se mexe.
        const primeiraTroca = storedMessages.length === 0;

        await saveMessage(sessionId, "user", userMessage);
        if (primeiraTroca) {
          // Antes da resposta: e enquanto o modelo responde que a lista e olhada.
          await definirTituloProvisorio(sessionId, userMessage).catch(() => {});
        }

        let assistantFullText = "";
        let savedPeriodizationId: string | undefined;

        const onToolCall = async (name: string, input: unknown): Promise<string> => {
          const typedInput = input as Record<string, unknown>;

          if (name === "propose_periodization") {
            // Propor de novo depois de salvar é o cartão renascendo como
            // "Aguardando aprovação" na tela de quem acabou de aprovar — e o
            // botão de salvar reaparece para uma periodização que já está no
            // banco. O turno sabe que salvou; recusar aqui é mais barato que
            // ensinar a tela a distinguir proposta velha de proposta nova.
            if (savedPeriodizationId) {
              return JSON.stringify({
                error: "Esta periodização já foi salva.",
                instrucao: "Não proponha de novo. Siga para os treinos da fase.",
              });
            }

            controller.enqueue(
              sseChunk({ type: "proposal", data: input as PeriodizationProposal }),
            );
            return "Proposta apresentada ao especialista. Aguardando revisão e aprovação.";
          }

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

          if (name === "query_body_scan") {
            return queryBodyScan(studentId);
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

          // Depois do stream, nunca durante: somar uma chamada a resposta que a
          // pessoa esta esperando trocaria organizacao por latencia.
          if (primeiraTroca) await nomearConversa(sessionId, userMessage, assistantFullText);
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

  // Com `?sessionId=`, carrega aquela conversa — validando o dono, porque o id
  // vem do cliente e esta rota usa `service_role`. Sem ele, retoma a mais
  // recente, que é o comportamento de antes.
  const pedida = request.nextUrl.searchParams.get("sessionId") ?? undefined;

  const sessionId = pedida
    ? await sessionOwnedBy(pedida, studentId, auth.caller.id)
    : await getOrCreateSession(studentId, auth.caller.id, "workout");

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }

  // Com que dados o coach está trabalhando. Vai junto do histórico porque a
  // tela precisa das duas coisas para abrir, e duas idas ao servidor mostrariam
  // a conversa antes de dizer o que ela sabe. Falha aqui não derruba o
  // histórico — a tira some, o chat abre.
  const [messages, contexto, estado] = await Promise.all([
    getSessionMessages(sessionId),
    Promise.all([
      loadStudentContext(studentId, auth.caller.id),
      formatBodyScanIndex(studentId).catch(() => ""),
    ])
      .then(([ctx, indice]) => resumirDisponibilidade(ctx, indice.length > 0))
      .catch(() => null),
    getSessionState(sessionId),
  ]);

  return NextResponse.json({
    sessionId,
    messages,
    availability: contexto,
    // A proposta guardada aqui é a mesma que a rota de aprovação salva — o
    // cartão na tela é uma vista dela. Sem devolvê-la, recarregar a página
    // apagava o cartão e o botão de aprovar junto, com a proposta viva no
    // banco. Pendente é, por definição, não aprovada: a aprovação limpa este
    // campo, então o cartão restaurado nasce sem treino marcado como salvo.
    workoutProposal: estado.pendingWorkoutProposal ?? null,
  });
}
