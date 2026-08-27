"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { useStudents } from "@/shared/hooks/useStudents";
import { ConversationSidebar } from "../components/ConversationSidebar";
import type { ChatModule, ChatSessionSummary } from "../types";

/**
 * Só um coach aparece por vez, e cada um traz seus cartões de proposta —
 * periodização e treinos de um lado, plano e refeições do outro. Importar os
 * dois de saída faria toda visita pagar por metade do código que não vai usar.
 */
const carregando = () => (
  <div className="flex h-64 items-center justify-center text-muted-foreground">
    Carregando conversa...
  </div>
);

const AiCoachChat = dynamic(() => import("../components/AiCoachChat").then((m) => m.AiCoachChat), {
  ssr: false,
  loading: carregando,
});

const NutritionCoachChat = dynamic(
  () => import("../components/NutritionCoachChat").then((m) => m.NutritionCoachChat),
  { ssr: false, loading: carregando },
);

const TITULO_DO_COACH: Record<ChatModule, string> = {
  workout: "Coach de Treino",
  nutrition: "Coach de Nutrição",
  general: "Coach",
};

/**
 * Os dois coaches do especialista sobre um aluno, na mesma tela.
 *
 * A lateral é dona da lista e de qual conversa está aberta; os componentes de
 * chat recebem o `sessionId` e não decidem mais sozinhos qual conversa carregar.
 * Era essa decisão espalhada que fazia toda conversa continuar a anterior.
 *
 * Treino e nutrição são conversas separadas no banco, com ferramentas
 * diferentes: a coluna da direita troca de componente conforme o módulo da
 * conversa aberta, em vez de um chat tentar servir aos dois.
 */
export function AiCoachWorkspace() {
  const params = useParams();
  const studentId = params.id as string;
  // Só o token: assinar a sessão inteira faria esta tela renderizar de novo
  // por campos que ela não usa.
  const accessToken = useAuthStore((s) => s.session?.access_token);
  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ChatModule>("workout");
  const [busy, setBusy] = useState(false);

  const carregarLista = useCallback(async (): Promise<ChatSessionSummary[]> => {
    if (!accessToken) return [];
    try {
      const data = await fetch(`/api/ai/chat/${studentId}/sessions?module=all`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());

      const lista = (data.sessions ?? []) as ChatSessionSummary[];
      setSessions(lista);
      return lista;
    } catch {
      // A lista é navegação: falhar aqui não pode impedir de conversar. O chat
      // da direita continua abrindo a conversa mais recente por conta própria.
      return [];
    }
  }, [accessToken, studentId]);

  // Abre a conversa mais recente, seja ela de treino ou de nutrição — é a que a
  // pessoa estava usando quando saiu.
  useEffect(() => {
    let cancelado = false;
    carregarLista().then((lista) => {
      if (cancelado || lista.length === 0) return;
      setActiveId((atual) => atual ?? lista[0].id);
      setActiveModule((atual) => (atual === "workout" ? lista[0].module : atual));
    });
    return () => {
      cancelado = true;
    };
  }, [carregarLista]);

  function selecionar(sessao: ChatSessionSummary) {
    setActiveModule(sessao.module);
    setActiveId(sessao.id);
  }

  async function criar(module: ChatModule) {
    if (!accessToken) return;
    setBusy(true);
    try {
      const { sessionId } = await fetch(`/api/ai/chat/${studentId}/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ module }),
      }).then((r) => r.json());

      setActiveModule(module);
      setActiveId(sessionId ?? null);
      await carregarLista();
    } finally {
      setBusy(false);
    }
  }

  async function arquivar(sessionId: string) {
    if (!accessToken) return;
    setBusy(true);
    try {
      await fetch(`/api/ai/chat/${studentId}/sessions`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const lista = await carregarLista();

      // Arquivar a conversa aberta deixaria a tela mostrando algo que saiu da
      // lista: recai na mais recente que sobrou.
      if (sessionId === activeId) {
        const proxima = lista[0] ?? null;
        setActiveId(proxima?.id ?? null);
        setActiveModule(proxima?.module ?? "workout");
      }
    } finally {
      setBusy(false);
    }
  }

  async function renomear(sessionId: string, title: string) {
    if (!accessToken) return;
    await fetch(`/api/ai/chat/${studentId}/sessions`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, title }),
    });
    await carregarLista();
  }

  /**
   * O chat resolveu qual conversa abriu.
   *
   * Sem `sessionId` ele retoma a mais recente — e cria uma se não houver
   * nenhuma. Nesse caso a lateral ainda não conhece a conversa, e recarregar é
   * o que evita a lista vazia ao lado de um chat aberto.
   */
  const registrarSessao = useCallback(
    (sessionId: string) => {
      setActiveId((atual) => atual ?? sessionId);
      void carregarLista();
    },
    [carregarLista],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>AI Coach</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
            />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-foreground text-xl">AI Coach</h2>
          <p className="text-muted-foreground text-sm">
            {TITULO_DO_COACH[activeModule]}
            {student?.full_name ? ` · ${student.full_name}` : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <ConversationSidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={selecionar}
          onCreate={criar}
          onArchive={arquivar}
          onRename={renomear}
          busy={busy}
        />

        {/* `key` força o chat a remontar ao trocar de conversa: as propostas
            pendentes e o histórico pertencem à conversa que sai, e reaproveitar
            o componente deixaria o cartão da anterior na tela da seguinte. */}
        <div className="min-w-0 flex-1">
          {activeModule === "nutrition" ? (
            <NutritionCoachChat
              key={activeId ?? "nutrition-recente"}
              studentId={studentId}
              sessionId={activeId}
              onSessionResolved={registrarSessao}
              onConversationChanged={carregarLista}
            />
          ) : (
            <AiCoachChat
              key={activeId ?? "workout-recente"}
              studentId={studentId}
              sessionId={activeId}
              onSessionResolved={registrarSessao}
              onConversationChanged={carregarLista}
            />
          )}
        </div>
      </div>
    </div>
  );
}
