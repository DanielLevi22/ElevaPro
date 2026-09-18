import { type NextRequest, NextResponse } from "next/server";
import { authenticatedUserId } from "./api-auth";
import { logger } from "./logger";
import { enforceRateLimit } from "./rate-limit";
import { enforceRequestBodyLimit, requestBodyLimits } from "./request-body-limit";
import { assertServerEnv, instrucaoDeAmbiente, ServerEnvError } from "./server-env";
import { attachTraceId, traceIdForRequest } from "./trace";

/**
 * O invólucro que impede uma rota de IA de morrer em HTML.
 *
 * ── O defeito que este arquivo existe para fechar ────────────────────────────
 *
 * Seis rotas de IA não tinham `try/catch` nenhum. Qualquer exceção — chave
 * ausente, modelo fora do ar, resposta vazia — virava a página de erro do Next,
 * `500` com `text/html`. O cliente móvel, que sabe ler `{"error": "..."}`, só
 * conseguia dizer "respondeu 500 com tipo desconhecido".
 *
 * Um invólucro e não seis `try/catch` porque a cópia é como o ponto cego fica
 * uniforme: alguém esquece uma rota, e é justamente a que quebra. Aqui a rota
 * declara o comportamento numa linha e não tem como esquecer metade dele.
 *
 * ── Por que a checagem de ambiente vem antes do handler ──────────────────────
 *
 * `ANTHROPIC_API_KEY` ausente não falha na construção do cliente — o SDK só
 * valida no request, dentro de `validateHeaders`, três camadas abaixo da causa.
 * Checando antes, a resposta distingue "está mal configurado" de "o modelo
 * falhou", que exigem ações diferentes de quem lê: a primeira é do time, a
 * segunda é tentar de novo.
 */

/**
 * Genérico no contexto para não precisar de cast: rota simples infere um
 * contexto vazio, rota dinâmica infere o seu `{ params }`, e as duas mantêm a
 * assinatura que o Next espera.
 */
type Handler<Ctx> = (request: NextRequest, context: Ctx) => Promise<Response>;
type WrappedHandler<Ctx> = (request: NextRequest, context?: Ctx) => Promise<Response>;

type AiRouteOptions = {
  maximumBodyBytes?: number;
};

/**
 * Aplica as proteções de borda comuns antes de executar uma rota de IA.
 *
 * @example
 * export const POST = withAiRoute((request) => responder(request));
 */
export function withAiRoute<Ctx>(
  handler: Handler<Ctx>,
  options: AiRouteOptions = {},
): WrappedHandler<Ctx> {
  return async (request, context) => {
    const traceId = traceIdForRequest(request);
    try {
      // Antes do handler: sem os segredos não há chamada possível, e falhar
      // aqui nomeia a variável em vez de deixar o SDK falhar por ela.
      assertServerEnv();

      const rateLimitUserId = await authenticatedUserId(request);
      const limited = await enforceRateLimit(request, "ai", traceId, rateLimitUserId);
      if (limited) return attachTraceId(limited, traceId);

      const oversized = await enforceRequestBodyLimit(
        request,
        options.maximumBodyBytes ?? requestBodyLimits.default,
      );
      if (oversized) return attachTraceId(oversized, traceId);

      return attachTraceId(await handler(request, context as Ctx), traceId);
    } catch (error) {
      if (error instanceof ServerEnvError) {
        // O log carrega quais faltam; a resposta não — nome de variável de
        // ambiente não é informação de cliente.
        logger.error("ai.route.misconfigured", {
          missing_environment: instrucaoDeAmbiente(error.faltando),
          trace_id: traceId,
        });
        return attachTraceId(
          NextResponse.json({ error: "server_misconfigured" }, { status: 503 }),
          traceId,
        );
      }

      logger.error("ai.route.failed", { error, trace_id: traceId });
      return attachTraceId(
        NextResponse.json({ error: "ai_unavailable" }, { status: 503 }),
        traceId,
      );
    }
  };
}
