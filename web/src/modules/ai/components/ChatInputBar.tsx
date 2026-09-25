"use client";

import type { KeyboardEvent, RefObject } from "react";
import { Button } from "@/shared/components/ui/Button";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  loading: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

/** A caixa de mensagem do chat de IA: textarea que cresce e o botão de enviar. */
export function ChatInputBar({ value, onChange, onKeyDown, onSend, loading, inputRef }: Props) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          disabled={loading}
          className="flex-1 resize-none bg-surface border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ height: "auto" }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
          }}
        />
        <Button
          size="icon"
          aria-label="Enviar mensagem"
          onClick={onSend}
          disabled={!value.trim() || loading}
          className="shrink-0"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Shift+Enter para nova linha · Enter para enviar
      </p>
    </div>
  );
}
