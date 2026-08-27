"use client";

import { useState } from "react";
import type { ChatModule, ChatSessionSummary } from "../types";

interface ConversationSidebarProps {
  sessions: ChatSessionSummary[];
  activeId: string | null;
  onSelect: (session: ChatSessionSummary) => void;
  onCreate: (module: ChatModule) => void;
  onArchive: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
  busy?: boolean;
}

const COACHES: { module: ChatModule; short: string }[] = [
  { module: "workout", short: "treino" },
  { module: "nutrition", short: "nutrição" },
];

/**
 * Rótulo da conversa na lista.
 *
 * Enquanto o título automático não existe (Fase 2), a data é o que distingue uma
 * conversa da outra — e distingue mal. Fica registrado como limitação, não como
 * solução.
 */
function rotulo(sessao: ChatSessionSummary): string {
  if (sessao.title) return sessao.title;
  return `Conversa de ${new Date(sessao.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })}`;
}

function IconeModulo({ module }: { module: ChatModule }) {
  if (module === "nutrition") {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-emerald-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6.5 6.5v11m11-11v11M4 9v6m16-6v6M6.5 12h11"
      />
    </svg>
  );
}

/**
 * A lista de conversas do especialista sobre este aluno, sempre visível.
 *
 * Mistura os dois coaches de propósito. São duas conversas sobre a mesma pessoa,
 * e separá-las em telas diferentes é o que fez o coach de nutrição ficar sem aba
 * e virar rota que só quem digita a URL alcança.
 *
 * Cada conversa tem histórico e propostas próprios; o que os coaches sabem sobre
 * o aluno — anamnese, avaliação, periodizações — é lido do banco a cada turno e
 * não pertence a nenhuma delas. Por isso conversa nova recomeça o diálogo sem
 * fazer o coach perguntar de novo o que já está gravado.
 */
export function ConversationSidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onArchive,
  onRename,
  busy = false,
}: ConversationSidebarProps) {
  const [aberta, setAberta] = useState(true);
  /** Qual conversa está sendo renomeada, e o texto em edição. */
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);

  function confirmarRenome() {
    if (!editando) return;
    const texto = editando.texto.trim();
    // Nome automático só age na primeira troca, então o que a pessoa escreve
    // aqui não é sobrescrito depois. Texto vazio é desistência, não apagar.
    if (texto) onRename(editando.id, texto);
    setEditando(null);
  }

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Mostrar conversas"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Mostrar conversas</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-border border-r pr-3">
      <div className="flex items-center justify-between pb-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Conversas
        </span>
        <button
          type="button"
          onClick={() => setAberta(false)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Esconder conversas"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>Esconder conversas</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Duas portas de entrada, não uma com menu: qual coach conduz a conversa
          é escolha do primeiro clique, e não dá para trocar depois — o histórico
          e as ferramentas são de um coach só. */}
      <div className="space-y-1.5 pb-4">
        {COACHES.map((coach) => (
          <button
            key={coach.module}
            type="button"
            onClick={() => onCreate(coach.module)}
            disabled={busy}
            className="flex w-full items-center gap-2 rounded-lg border border-border border-dashed px-3 py-2 text-left text-foreground text-sm transition-colors hover:bg-overlay-05 disabled:opacity-50"
          >
            <span className="text-muted-foreground">+</span>
            <IconeModulo module={coach.module} />
            <span className="truncate">Nova de {coach.short}</span>
          </button>
        ))}
      </div>

      <p className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-widest">
        Recentes
      </p>

      <div className="-mr-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground text-xs">
            Nenhuma conversa ainda. Escolha um coach acima para começar.
          </p>
        ) : null}

        {sessions.map((sessao) => {
          const ativa = sessao.id === activeId;
          return (
            <div
              key={sessao.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                ativa
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-overlay-05"
              }`}
            >
              <IconeModulo module={sessao.module} />
              {editando?.id === sessao.id ? (
                <input
                  // O campo nasce de um clique deliberado em "renomear": focar
                  // pelo ref evita o `autoFocus`, que rouba o foco de quem
                  // navega por teclado em outro ponto da tela.
                  ref={(el) => el?.focus()}
                  value={editando.texto}
                  onChange={(e) => setEditando({ id: sessao.id, texto: e.target.value })}
                  onBlur={confirmarRenome}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmarRenome();
                    if (e.key === "Escape") setEditando(null);
                  }}
                  aria-label="Novo nome da conversa"
                  className="min-w-0 flex-1 rounded border border-border bg-surface px-1 text-foreground text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(sessao)}
                  onDoubleClick={() => setEditando({ id: sessao.id, texto: rotulo(sessao) })}
                  disabled={busy}
                  aria-current={ativa ? "true" : undefined}
                  className="flex-1 truncate text-left text-sm disabled:opacity-50"
                >
                  {rotulo(sessao)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditando({ id: sessao.id, texto: rotulo(sessao) })}
                disabled={busy}
                aria-label={`Renomear ${rotulo(sessao)}`}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Renomear</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onArchive(sessao.id)}
                disabled={busy}
                aria-label={`Arquivar ${rotulo(sessao)}`}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Arquivar</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
