import type { ChatMessage } from '@elevapro/shared';
import { useCallback, useRef, useState } from 'react';

export interface StreamHandlers {
  text: (chunk: string) => void;
  error: (message: string) => void;
}

export interface ChatConversation {
  messages: ChatMessage[];
  responding: boolean;
  /** Troca pela conversa salva; vazia mantém a saudação. */
  load: (saved: ChatMessage[]) => void;
  /** Mostra a pergunta e monta a resposta com o que o stream emitir. */
  reply: (question: string, stream: (handlers: StreamHandlers) => Promise<void>) => Promise<void>;
  /** Uma fala do assistente fora do stream, como "Plano salvo". */
  say: (content: string) => void;
}

const FALLBACK = 'Não consegui responder agora. Tente de novo.';

function message(role: ChatMessage['role'], content: string): ChatMessage {
  const id = `${role}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  return { id, role, content, createdAt: new Date().toISOString() };
}

/**
 * A conversa com um assistente de IA: a saudação, a pergunta, a resposta
 * montada enquanto o stream chega e o erro no lugar da resposta. As propostas
 * — o que muda de um assistente para outro — ficam com quem chama.
 *
 * Mora em `shared/` porque o assistente de treino (#335) e o de nutrição
 * (#337) são a mesma conversa, e módulo não importa módulo.
 *
 * @example
 * const chat = useChatConversation('Olá! Por onde começamos?');
 * await chat.reply(texto, ({ text, error }) => servico.enviar(texto, (e) => ...));
 */
export function useChatConversation(greeting: string): ChatConversation {
  const greetingMessage = useRef(message('assistant', greeting)).current;
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMessage]);
  const [responding, setResponding] = useState(false);

  const load = useCallback(
    (saved: ChatMessage[]) => setMessages(saved.length > 0 ? saved : [greetingMessage]),
    [greetingMessage]
  );

  const say = useCallback((content: string) => {
    setMessages((current) => [...current, message('assistant', content)]);
  }, []);

  const reply = useCallback(
    async (question: string, stream: (handlers: StreamHandlers) => Promise<void>) => {
      const asked = question.trim();
      if (!asked) return;

      const answer = message('assistant', '');
      const setAnswer = (update: (content: string) => string) =>
        setMessages((current) =>
          current.map((m) => (m.id === answer.id ? { ...m, content: update(m.content) } : m))
        );

      setMessages((current) => [...current, message('user', asked), answer]);
      setResponding(true);
      try {
        await stream({
          text: (chunk) => setAnswer((content) => content + chunk),
          error: (reason) => setAnswer(() => `Erro: ${reason}`),
        });
      } catch {
        setAnswer(() => FALLBACK);
      } finally {
        setResponding(false);
      }
    },
    []
  );

  return { messages, responding, load, reply, say };
}
