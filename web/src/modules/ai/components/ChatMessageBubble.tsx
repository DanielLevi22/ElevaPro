import type { ChatMessage } from "../types";
import { TextoDoAssistente } from "./TextoDoAssistente";

interface Props {
  msg: ChatMessage;
}

/** Uma bolha da conversa — do especialista ou do assistente, com os três pontinhos enquanto o texto ainda não chegou. */
export function ChatMessageBubble({ msg }: Props) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      {msg.role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mr-2 mt-0.5">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          msg.role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-surface border border-white/10 text-foreground rounded-bl-sm"
        }`}
      >
        {/* Só o texto do assistente é interpretado: quem escreve um
            asterisco na própria mensagem espera ver um asterisco. */}
        {msg.content ? (
          msg.role === "assistant" ? (
            <TextoDoAssistente content={msg.content} />
          ) : (
            msg.content
          )
        ) : (
          <span className="flex gap-1 items-center text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </span>
        )}
      </div>
    </div>
  );
}
