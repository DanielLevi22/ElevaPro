import { saveMessage, updateMessage } from "./chatService";

/**
 * A resposta do assistente sendo gravada enquanto chega.
 *
 * Antes ela só ia para o banco depois de o turno inteiro terminar, e a pergunta
 * já estava salva desde o começo. Quem perdia a conexão — ou batia no
 * `maxDuration = 60` da Vercel — reabria a conversa e via o que perguntou com
 * silêncio embaixo; o turno seguinte lia esse histórico e o assistente não
 * sabia que tinha respondido.
 *
 * Gravar no `catch` não resolveria: quando a Vercel corta nos 60 segundos o
 * processo é encerrado, não há exceção subindo, e nenhum `catch` roda. A única
 * defesa é já ter escrito antes do corte.
 *
 * **A gravação não segura o stream.** `empurrar` não espera o banco: dispara no
 * máximo uma escrita por vez e, enquanto ela está em voo, o texto continua
 * chegando. Uma resposta lenta do banco atrasa a próxima gravação, nunca o
 * próximo pedaço na tela.
 *
 * @example
 * const resposta = criarRespostaEmProgresso(sessionId);
 * for await (const evento of turno) {
 *   if (evento.type === "text") resposta.empurrar(evento.content);
 * }
 * await resposta.concluir();
 */
export interface RespostaEmProgresso {
  /** Acrescenta um pedaço. Grava se já passou tempo suficiente desde a última vez. */
  empurrar(pedaco: string): void;
  /** O turno acabou inteiro: grava o que falta e tira a marca de incompleta. */
  concluir(metadata?: Record<string, unknown>): Promise<void>;
  /** O turno acabou no meio: grava o que chegou e mantém a marca de incompleta. */
  interromper(): Promise<void>;
  /** Tudo que chegou até agora, para quem precisa do texto inteiro. */
  readonly texto: string;
}

/**
 * Quanto tempo entre uma gravação e a seguinte.
 *
 * O texto chega dezenas de vezes por segundo; gravar a cada pedaço seriam
 * centenas de escritas por turno para proteger contra um corte que quase nunca
 * acontece. Três segundos é o que se perde no pior caso — menos de uma frase.
 *
 * O relógio começa a contar na criação, e não em zero, de propósito: sem isso a
 * primeira palavra de todo turno dispararia uma escrita, e as respostas curtas
 * passariam a custar duas idas ao banco onde hoje custam uma.
 */
const ESPACO_ENTRE_GRAVACOES_MS = 3000;

/** A marca que diz que aquilo ali não é uma resposta inteira. */
export const RESPOSTA_INCOMPLETA = { incompleta: true } as const;

export interface DependenciasDaResposta {
  salvar: typeof saveMessage;
  atualizar: typeof updateMessage;
  agora: () => number;
}

export function criarRespostaEmProgresso(
  sessionId: string,
  deps: DependenciasDaResposta = { salvar: saveMessage, atualizar: updateMessage, agora: Date.now },
): RespostaEmProgresso {
  let texto = "";
  let messageId: string | null = null;
  let ultimaGravacao = deps.agora();
  let emVoo: Promise<void> | null = null;

  async function gravar(metadata: Record<string, unknown>): Promise<void> {
    const conteudo = texto;
    if (conteudo.trim().length === 0) return;

    if (messageId === null) {
      // Sem id de volta, o insert não chegou a acontecer: continuar `null` faz
      // a próxima gravação tentar inserir de novo, que é o certo. Guardar
      // `undefined` faria a seguinte chamar `atualizar` sem linha para atualizar.
      messageId = (await deps.salvar(sessionId, "assistant", conteudo, metadata)) ?? null;
      if (messageId === null) return;
    } else {
      await deps.atualizar(messageId, conteudo, metadata);
    }
    ultimaGravacao = deps.agora();
  }

  /** Espera a escrita em voo, se houver, e engole a falha dela. */
  async function acalmar(): Promise<void> {
    if (!emVoo) return;
    await emVoo.catch(() => {});
    emVoo = null;
  }

  return {
    get texto() {
      return texto;
    },

    empurrar(pedaco: string): void {
      texto += pedaco;

      // Uma escrita por vez. Enfileirar não adiantaria: a próxima gravaria o
      // mesmo texto acumulado, só que mais tarde.
      if (emVoo) return;
      if (deps.agora() - ultimaGravacao < ESPACO_ENTRE_GRAVACOES_MS) return;

      emVoo = gravar(RESPOSTA_INCOMPLETA)
        .catch((erro) => {
          // Perder uma gravação intermediária custa alguns segundos de texto; a
          // próxima grava tudo de novo. Derrubar o turno por isso custaria a
          // resposta inteira.
          console.error("[respostaEmProgresso] falha ao gravar o parcial", sessionId, erro);
        })
        .finally(() => {
          emVoo = null;
        });
    },

    async concluir(metadata?: Record<string, unknown>): Promise<void> {
      await acalmar();
      await gravar(metadata ?? {});
    },

    async interromper(): Promise<void> {
      await acalmar();
      await gravar(RESPOSTA_INCOMPLETA);
    },
  };
}
