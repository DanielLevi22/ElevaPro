import type { ChatMessage } from "../types";

/**
 * Quanto da conversa vai junto no próximo turno.
 *
 * `getSessionMessages` devolve tudo o que já foi dito, e nada nas mensagens
 * leva `cache_control` — então uma conversa de trinta trocas é reenviada
 * inteira, a preço cheio, a cada turno. O custo cresce com a conversa, e é a
 * única peça do prompt que cresce sem teto.
 *
 * O corte é por número de mensagens e não por tokens de propósito: contar token
 * exigiria o tokenizador da Anthropic no servidor, e o ganho de precisão não
 * paga a dependência. Trinta mensagens cobrem com folga o que uma conversa de
 * montagem precisa lembrar.
 */
const JANELA = 30;

/**
 * O que aconteceu de irreversível na conversa, dito em uma linha.
 *
 * Estas mensagens **nunca** saem do histórico, mesmo velhas. São elas que
 * impedem o assistente de pedir aprovação do que já foi aprovado — o defeito
 * que a periodização levou meses carregando. Custam uma linha cada; perdê-las
 * custa uma prescrição gravada duas vezes.
 */
const RAZAO = "✅";

/**
 * As mensagens que vão ao modelo neste turno.
 *
 * @example
 * const history = historicoDoTurno(await getSessionMessages(sessionId));
 */
export function historicoDoTurno(
  mensagens: ChatMessage[],
  janela = JANELA,
): Array<{ role: "user" | "assistant"; content: string }> {
  const recentes = mensagens.slice(-janela);
  const cortadas = mensagens.slice(0, Math.max(0, mensagens.length - janela));

  // As linhas de razão que ficaram para trás voltam, na ordem original, antes
  // do trecho recente: o que foi salvo aconteceu antes do que se conversa agora.
  const razoesAntigas = cortadas.filter((m) => m.content.includes(RAZAO));

  return [...razoesAntigas, ...recentes].map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
