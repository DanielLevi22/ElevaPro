/**
 * O que dizer na conversa quando o turno falha.
 *
 * Toda exceção virava a mesma frase: "não consegui responder agora, tente de
 * novo em instantes". Ela é verdadeira para falha passageira e **mentira** para
 * credencial revogada — nesse caso tentar de novo nunca funciona, e quem lê
 * fica repetindo uma ação impossível achando que é azar. Aconteceu de verdade,
 * com a chave recusada com 401 enquanto a tela pedia paciência.
 *
 * É a mesma distinção que `lib/ai-route.ts` já defende por escrito para as
 * rotas de tiro único — "está mal configurado" e "o modelo falhou" exigem ações
 * diferentes de quem lê. Aqui ela alcança as rotas de streaming, que são as dos
 * chats, e olha a resposta em vez de só a existência da variável: chave
 * presente e revogada passava direto pela checagem de ambiente.
 *
 * ⚠️ Nada técnico atravessa: nome de variável, provedor e texto do SDK ficam no
 * log. O que muda aqui é **qual ação** a frase pede.
 *
 * @example
 * controller.enqueue(sseChunk({ type: "error", message: mensagemDeFalha(err) }));
 */
const CREDENCIAL =
  "O assistente está sem credencial válida para responder. " +
  "Isso é configuração do sistema, não algo que tentar de novo resolva — avise quem administra a plataforma.";

const LIMITE =
  "O assistente atingiu o limite de uso no momento. Aguarde alguns minutos e tente de novo.";

const DESCONHECIDA = "Não consegui responder agora. Tente de novo em instantes.";

/** O status HTTP que o erro carrega, quando carrega. */
function statusDe(erro: unknown): number | null {
  if (typeof erro !== "object" || erro === null) return null;
  const status = (erro as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function mensagemDeFalha(erro: unknown): string {
  const status = statusDe(erro);

  // 401 é credencial recusada; 403 é credencial válida sem permissão para o
  // que foi pedido. As duas são do time, não de quem está conversando.
  if (status === 401 || status === 403) return CREDENCIAL;
  if (status === 429) return LIMITE;

  return DESCONHECIDA;
}
