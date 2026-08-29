import { type NextRequest, NextResponse } from "next/server";
import { assertServerEnv, instrucaoDeAmbiente, ServerEnvError } from "./server-env";

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
type Handler<Ctx> = (request: NextRequest, contexto: Ctx) => Promise<Response>;

export function rotaDeIA<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, contexto) => {
    try {
      // Antes do handler: sem os segredos não há chamada possível, e falhar
      // aqui nomeia a variável em vez de deixar o SDK falhar por ela.
      assertServerEnv();

      return await handler(request, contexto);
    } catch (erro) {
      if (erro instanceof ServerEnvError) {
        // O log carrega quais faltam; a resposta não — nome de variável de
        // ambiente não é informação de cliente.
        console.error("[ia] configuração de servidor ausente", instrucaoDeAmbiente(erro.faltando));
        return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
      }

      console.error("[ia] rota falhou", erro);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
  };
}
