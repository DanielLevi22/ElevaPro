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
  workout: "Assistente de Treino",
  nutrition: "Assistente de Nutrição",
  general: "Assistente",
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
  /**
   * A conversa aberta, ou `null` enquanto ninguém escolheu.
   *
   * Um par, não dois estados. Enquanto o id e o módulo viviam separados, eles
   * podiam discordar: o id apontava para a conversa de treino e o módulo dizia
   * `nutrition`, e a tela renderizava o chat de nutrição carregando a conversa
   * de treino. `null` também é o que distingue "ninguém escolheu" de "escolheu
   * treino" — antes os dois eram o mesmo valor, e por isso a escolha da pessoa
   * era sobrescrita.
   */
  const [conversa, setConversa] = useState<{ id: string; module: ChatModule } | null>(null);
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
  //
  // Só quando não há nenhuma escolhida. Este efeito roda de novo sempre que o
  // `accessToken` muda, e o Supabase renova o token sozinho de tempos em
  // tempos: sem a guarda, a conversa trocava no meio do uso, sem ninguém
  // clicar em nada.
  useEffect(() => {
    let cancelado = false;
    carregarLista().then((lista) => {
      if (cancelado || lista.length === 0) return;
      setConversa((atual) => atual ?? { id: lista[0].id, module: lista[0].module });
    });
    return () => {
      cancelado = true;
    };
  }, [carregarLista]);

  function selecionar(sessao: ChatSessionSummary) {
    setConversa({ id: sessao.id, module: sessao.module });
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

      setConversa(sessionId ? { id: sessionId, module } : null);
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
      if (sessionId === conversa?.id) {
        const proxima = lista[0] ?? null;
        setConversa(proxima ? { id: proxima.id, module: proxima.module } : null);
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
      // O módulo é o do chat que está na tela — sem conversa escolhida, é o de
      // treino, que é o que a tela renderiza por padrão.
      setConversa((atual) => atual ?? { id: sessionId, module: "workout" });
      void carregarLista();
    },
    [carregarLista],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>Assistente</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
            />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-foreground text-xl">Assistente</h2>
          <p className="text-muted-foreground text-sm">
            {TITULO_DO_COACH[conversa?.module ?? "workout"]}
            {student?.full_name ? ` · ${student.full_name}` : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <ConversationSidebar
          sessions={sessions}
          activeId={conversa?.id ?? null}
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
          {conversa?.module === "nutrition" ? (
            <NutritionCoachChat
              key={conversa?.id ?? "nutrition-recente"}
              studentId={studentId}
              sessionId={conversa?.id ?? null}
              onSessionResolved={registrarSessao}
              onConversationChanged={carregarLista}
            />
          ) : (
            <AiCoachChat
              key={conversa?.id ?? "workout-recente"}
              studentId={studentId}
              sessionId={conversa?.id ?? null}
              onSessionResolved={registrarSessao}
              onConversationChanged={carregarLista}
            />
          )}
        </div>
      </div>
    </div>
  );
}
