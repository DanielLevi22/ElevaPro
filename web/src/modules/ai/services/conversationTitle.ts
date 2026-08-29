import { aiProviders } from "../ai.config";
import { updateSessionTitle } from "./chatService";

/** Cabe na largura da lateral sem cortar no meio de uma palavra. */
const LIMITE = 48;

/**
 * O que o gerador pode e não pode escrever.
 *
 * O título fica visível o tempo todo na lateral — inclusive para quem passa
 * atrás do especialista —, diferente do corpo da conversa, que exige abrir e
 * rolar. Um título como "Hérnia de disco L5" transforma dado de saúde em
 * cartaz. Por isso o pedido é pelo **tema do trabalho**, não pela condição do
 * aluno, e sem o nome dele.
 */
const INSTRUCAO = `Você nomeia conversas entre um personal trainer e seu assistente.

Devolva SÓ o título, sem aspas, sem ponto final, no máximo 5 palavras.

Nomeie o TRABALHO, não a pessoa nem a condição de saúde dela:
- "Bloco de força — 8 semanas"  (bom)
- "Plano alimentar de cutting"  (bom)
- "Reabilitação de hérnia L5"   (RUIM: expõe condição clínica)
- "Treino do João"              (RUIM: nomeia a pessoa)
- "Planejamento de treino"      (RUIM: serve para qualquer conversa)`;

/**
 * Corta na palavra, não no caractere.
 *
 * @example
 * tituloProvisorio("Preciso montar um bloco de hipertrofia pra ele")
 * // "Preciso montar um bloco de hipertrofia pra…"
 */
export function tituloProvisorio(mensagem: string): string {
  const limpo = mensagem.replace(/\s+/g, " ").trim();
  if (limpo.length <= LIMITE) return limpo;

  const corte = limpo.slice(0, LIMITE);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 20 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/**
 * Nome imediato, na hora do envio.
 *
 * Existe porque o definitivo só fica pronto depois da resposta, e é justamente
 * enquanto o modelo responde que a pessoa olha a lista. Sem isto, a conversa
 * nova aparece como "Conversa de 27/08" — a limitação que a lateral veio
 * resolver.
 */
export async function definirTituloProvisorio(sessionId: string, mensagem: string): Promise<void> {
  await updateSessionTitle(sessionId, tituloProvisorio(mensagem));
}

/**
 * Substitui o provisório por um título gerado a partir da primeira troca.
 *
 * Roda **depois** do stream terminar: somar uma chamada à resposta que a pessoa
 * está esperando trocaria um problema de organização por um de latência.
 *
 * Usa o modelo rápido porque o `ADR-0005` fixa isso para tarefa
 * estruturada de baixa latência — "10x mais barato, nunca usar Sonnet aqui".
 *
 * Falha em silêncio de propósito: o provisório continua valendo, e título é
 * conveniência — não pode derrubar a conversa que já foi respondida.
 */
export async function nomearConversa(
  sessionId: string,
  pergunta: string,
  resposta: string,
): Promise<void> {
  try {
    let texto = "";
    for await (const evento of aiProviders.fast.stream({
      systemBlocks: [{ text: INSTRUCAO }],
      messages: [
        {
          role: "user",
          content: `Conversa:\n\nEspecialista: ${pergunta}\n\nAssistente: ${resposta.slice(0, 800)}`,
        },
      ],
      tools: [],
      maxTokens: 32,
    })) {
      if (evento.type === "text_delta") texto += evento.content;
    }

    const titulo = texto.replace(/["\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, LIMITE);
    if (titulo) await updateSessionTitle(sessionId, titulo);
  } catch (err) {
    console.error("[nomearConversa] sessão", sessionId, err);
  }
}
