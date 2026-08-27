"use client";

import { useState } from "react";
import type { ChatSessionSummary } from "../types";

interface ConversationPickerProps {
  sessions: ChatSessionSummary[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onArchive: (sessionId: string) => void;
  busy?: boolean;
}

function rotulo(sessao: ChatSessionSummary): string {
  // Enquanto não há título automático, a data é o que distingue uma conversa da
  // outra. Fica registrado como limitação: uma lista de datas ajuda pouco, e é
  // por isso que a Fase 3 do PRD existe.
  if (sessao.title) return sessao.title;
  return `Conversa de ${new Date(sessao.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })}`;
}

/**
 * Escolher entre as conversas do coach sobre este aluno.
 *
 * Cada conversa tem histórico e propostas próprios; o que o coach sabe sobre o
 * aluno — anamnese, avaliação, periodizações — é lido do banco a cada turno e
 * não pertence a nenhuma delas. Por isso conversa nova recomeça o diálogo sem
 * fazer o coach perguntar de novo o que já está gravado.
 */
export function ConversationPicker({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onArchive,
  busy = false,
}: ConversationPickerProps) {
  const [aberto, setAberto] = useState(false);
  const atual = sessions.find((s) => s.id === activeId);

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={busy}
        aria-expanded={aberto}
        className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-surface text-sm text-foreground hover:bg-overlay-05 transition-colors disabled:opacity-50"
      >
        <span className="max-w-[180px] truncate">{atual ? rotulo(atual) : "Conversa atual"}</span>
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Trocar de conversa</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        title="Nova conversa"
        className="w-9 h-9 rounded-lg border border-border bg-surface text-foreground hover:bg-overlay-05 transition-colors disabled:opacity-50 flex items-center justify-center"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Nova conversa</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {aberto && (
        <>
          {/* Fecha ao clicar fora. Sem isto o menu fica preso aberto sobre o
              chat, que é onde o especialista precisa digitar. */}
          <button
            type="button"
            aria-label="Fechar lista de conversas"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAberto(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl z-50 p-1">
            {sessions.length === 0 && (
              <p className="text-muted-foreground text-xs p-3">Nenhuma conversa ainda.</p>
            )}

            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-lg ${
                  s.id === activeId ? "bg-overlay-05" : "hover:bg-overlay-05"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s.id);
                    setAberto(false);
                  }}
                  className="flex-1 text-left px-3 py-2 min-w-0"
                >
                  <span className="block text-sm text-foreground truncate">{rotulo(s)}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {new Date(s.updated_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onArchive(s.id)}
                  title="Arquivar"
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>Arquivar conversa</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
