import type { Json } from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Aprovar uma proposta grava tudo, ou não deixa rastro.
 *
 * As três rotas de aprovação liam a proposta pendente, gravavam, e só então
 * limpavam o pendente. Entre a leitura e a limpeza não havia nada segurando a
 * porta: duas abas, dois aparelhos, ou um retry depois do `maxDuration = 60`
 * da Vercel, e os mesmos treinos entravam duas vezes na conta do aluno.
 *
 * Aqui a proposta é **reivindicada**, não lida — `reivindicar_proposta` a tira
 * do `state` sob a trava da linha, e quem chega depois recebe `null`. E como a
 * reivindicação é destrutiva, uma falha no meio da gravação desfaz o que entrou
 * e devolve a proposta à fila de decisão.
 */

/** As três propostas que esperam decisão no `state` da conversa. */
export type ChaveDeProposta =
  | "pendingPeriodization"
  | "pendingWorkoutProposal"
  | "pendingDietPlan"
  | "pendingDietMeals"
  | "pendingStudentPlan";

export interface Gravacao<Proposta, Resultado> {
  /** Grava a proposta reivindicada. Lançar aqui aciona o `desfazer`. */
  gravar: (proposta: Proposta) => Promise<Resultado>;
  /**
   * Apaga o que o `gravar` chegou a criar antes de falhar.
   *
   * A rota é quem sabe: são os ids que ela acumulou no laço. Sem isto, meia
   * gravação ficaria no banco com a proposta de volta na fila — e a segunda
   * tentativa duplicaria a metade que já tinha passado.
   */
  desfazer: () => Promise<void>;
}

/**
 * Reivindica a proposta e grava, ou devolve `null` se já não havia o que aprovar.
 *
 * `null` é a resposta para o segundo clique, para a segunda aba e para o retry
 * que chegou depois do primeiro pedido ter terminado — todos os casos em que a
 * gravação já aconteceu. A rota responde 400 sem gravar nada.
 *
 * @example
 * const salvos: string[] = [];
 * const saved = await aprovarProposta<BulkWorkoutProposal, Treino[]>(sessionId, "pendingWorkoutProposal", {
 *   gravar: async (proposta) => { ... salvos.push(id) ... },
 *   desfazer: () => apagarTreinos(salvos),
 * });
 * if (!saved) return NextResponse.json({ error: "Nenhuma proposta pendente." }, { status: 400 });
 */
export async function aprovarProposta<Proposta, Resultado>(
  sessionId: string,
  chave: ChaveDeProposta,
  acao: Gravacao<Proposta, Resultado>,
): Promise<Resultado | null> {
  const { data, error } = await supabaseAdmin.rpc("reivindicar_proposta", {
    p_session_id: sessionId,
    p_chave: chave,
  });

  if (error) throw new Error(`reivindicar_proposta(${chave}) falhou: ${error.message}`);
  if (data === null || data === undefined) return null;

  // O `data` vem tipado como `Json` pelo contrato da função. A forma exata é
  // a que a rota conhece — quem grava treino sabe que recebeu treino.
  const proposta = data as Proposta;

  try {
    return await acao.gravar(proposta);
  } catch (erro) {
    // Ordem importa: primeiro tira o que entrou, depois devolve a proposta. Ao
    // contrário, uma segunda aprovação poderia começar com as linhas da
    // primeira ainda no banco.
    await acao.desfazer().catch((falhaAoDesfazer) => {
      // Desfazer que falha é o pior caso, e precisa aparecer: o banco fica com
      // linhas órfãs e a proposta volta para a fila.
      console.error("[aprovarProposta] não consegui desfazer", chave, sessionId, falhaAoDesfazer);
    });
    await devolverProposta(sessionId, chave, data);
    throw erro;
  }
}

async function devolverProposta(
  sessionId: string,
  chave: ChaveDeProposta,
  proposta: Json,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("devolver_proposta", {
    p_session_id: sessionId,
    p_chave: chave,
    p_valor: proposta,
  });

  if (error) {
    // Sem lançar: quem chamou já está tratando a falha original, e essa é a que
    // a pessoa precisa ver. Perder a devolução custa uma proposta; esconder a
    // causa custa o diagnóstico.
    console.error("[aprovarProposta] não consegui devolver a proposta", chave, sessionId, error);
  }
}
