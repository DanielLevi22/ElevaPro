import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist, authorizeStudent } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AiSessionState, ChatModule } from "../types";
import { aprovarProposta, type ChaveDeProposta } from "./aprovacaoDaProposta";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "./chatService";
import { getOrCreateStudentCoachSession } from "./studentCoachService";

/**
 * O esqueleto de toda aprovação de proposta.
 *
 * As quatro rotas de aprovação chegaram à mesma forma uma de cada vez, cada uma
 * depois de um defeito próprio — e é justamente por terem chegado separadas que
 * a periodização ficou dois meses salvando pelo chat enquanto as outras já
 * salvavam pelo botão. Padrão que existe só por convenção volta a divergir.
 *
 * O princípio que este módulo torna estrutural: **o modelo propõe, o sistema
 * dispõe.** O que a rota grava é a cópia que a pessoa revisou no cartão, nunca
 * o que o modelo reemite; a proposta é reivindicada sob trava de linha, e uma
 * falha no meio desfaz o que entrou.
 *
 * O que varia entre as quatro é declarado; o que não varia mora aqui.
 *
 * @example
 * export const POST = criarRotaDeAprovacao<DietPlanProposal, { id: string }>({
 *   chave: "pendingDietPlan",
 *   modulo: "nutrition",
 *   gravar: async ({ studentId }, plano) => ({ id: await gravarPlano(studentId, plano) }),
 *   resolver: (plano) => ({ resolvedDietPlan: plano }),
 *   mensagem: (plano) => `✅ Plano salvo: ${plano.name}.`,
 *   corpo: (plano, { id }) => ({ id, name: plano.name }),
 * });
 */

/**
 * Quem pode aprovar, e em qual conversa.
 *
 * É a única coisa que varia de verdade entre os assistentes: o especialista age
 * sobre um aluno vinculado, e o aluno age sobre si mesmo. Fora isto, aprovar é
 * aprovar — e por isso o resto do esqueleto é um só.
 */
export type Acesso = (
  request: NextRequest,
  params: { studentId?: string },
) => Promise<
  | { ok: true; studentId: string; specialistId?: string; sessionId: string }
  | { ok: false; response: NextResponse }
>;

/**
 * O especialista aprovando na conta de um aluno vinculado.
 *
 * `studentId` vem da URL: sem a checagem de vínculo, a rota gravaria prescrição
 * na conta de qualquer aluno. O `service_role` que grava não consulta RLS — a
 * barreira é esta função.
 *
 * A conversa vem do cliente porque a proposta vive no `state` daquela que a
 * produziu: sem o id, aprovar numa conversa antiga da lateral lia o estado de
 * outra, e respondia "nenhuma proposta pendente" com a proposta na tela.
 */
export function acessoDoEspecialista(modulo: ChatModule): Acesso {
  return async (request, params) => {
    const studentId = params.studentId ?? "";
    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return { ok: false, response: auth.response };

    const specialistId = auth.caller.id;
    const corpo = await request.json().catch(() => null);
    const pedida = typeof corpo?.sessionId === "string" ? corpo.sessionId : undefined;

    const sessionId = pedida
      ? await sessionOwnedBy(pedida, studentId, specialistId)
      : await getOrCreateSession(studentId, specialistId, modulo);

    return sessionId
      ? { ok: true, studentId, specialistId, sessionId }
      : {
          ok: false,
          response: NextResponse.json({ error: "conversa não encontrada" }, { status: 404 }),
        };
  };
}

/**
 * O aluno aprovando o próprio plano.
 *
 * Não há `studentId` na URL nem conversa a escolher: o aluno tem uma só, e ela
 * é dele. Por isso o id não vem do cliente — não há o que validar, e nada a
 * confundir com a conversa de outra pessoa.
 */
export const acessoDoAluno: Acesso = async (request) => {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return { ok: false, response: auth.response };

  const studentId = auth.caller.id;
  return { ok: true, studentId, sessionId: await getOrCreateStudentCoachSession(studentId) };
};

/** O que a gravação recebe, além da proposta. */
export interface ContextoDaAprovacao {
  studentId: string;
  /** Ausente quando quem aprova é o próprio aluno. */
  specialistId?: string;
  sessionId: string;
  /** O `state` como estava antes da reivindicação. */
  estado: AiSessionState;
  /**
   * Registra um id criado agora, para o desfazer alcançá-lo.
   *
   * Sem isto, uma falha no meio do laço deixaria as linhas que já entraram no
   * banco com a proposta de volta na fila — e a tentativa seguinte as
   * duplicaria.
   */
  registrar(id: string): void;
}

/**
 * O especialista que `acessoDoEspecialista` garante.
 *
 * `specialistId` é opcional no contexto porque o aluno aprova o próprio plano
 * sem especialista nenhum. Nas rotas de especialista ele sempre existe — e se
 * um dia não existir, é porque o acesso foi declarado errado, e isso precisa
 * falhar alto em vez de gravar prescrição sem dono.
 */
export function especialistaDe(ctx: ContextoDaAprovacao): string {
  if (!ctx.specialistId) {
    throw new Error(
      `rota de especialista sem specialistId (recebido: ${ctx.specialistId}) — o acesso declarado deveria ser acessoDoEspecialista`,
    );
  }
  return ctx.specialistId;
}

/** Recusa antes de reivindicar, quando ainda dá para corrigir sem perder a proposta. */
export interface Recusa {
  erro: string;
  status: number;
}

export interface Aprovacao<Proposta, Resultado> {
  /** Qual proposta do `state` esta rota aprova. */
  chave: ChaveDeProposta;
  /** Quem pode aprovar e onde está a conversa. */
  acesso: Acesso;
  /**
   * Tabela de onde o desfazer apaga o que foi criado.
   *
   * As filhas caem por `ON DELETE CASCADE`: apagar o treino leva os exercícios,
   * apagar a refeição leva os alimentos. Ausente quando a gravação é um insert
   * só — aí não existe "meio".
   */
  desfazerEm?: "workouts" | "diet_meals" | "training_periodizations";
  /**
   * Checagem que roda **antes** da reivindicação.
   *
   * Existe porque reivindicar é destrutivo: recusar depois consumiria a
   * proposta para devolver um erro que a pessoa ainda pode corrigir no chat —
   * é o caso dos alimentos que não estão no catálogo.
   */
  verificar?(ctx: Omit<ContextoDaAprovacao, "registrar">): Promise<Recusa | null>;
  gravar(ctx: ContextoDaAprovacao, proposta: Proposta): Promise<Resultado>;
  /** O que registrar no `state` depois do sucesso, para o cartão reabrir marcado. */
  resolver(
    proposta: Proposta,
    resultado: Resultado,
    estado: AiSessionState,
  ): Partial<AiSessionState>;
  /**
   * A frase que entra no histórico.
   *
   * A aprovação acontece no cartão, fora da conversa. Sem esta linha o
   * histórico não registra nada, e no turno seguinte o assistente pede
   * aprovação de novo — do que acabou de ser aprovado.
   */
  mensagem(proposta: Proposta, resultado: Resultado): string;
  corpo(proposta: Proposta, resultado: Resultado): unknown;
  /** Prefixo do log, para separar as quatro rotas na saída. */
  rotulo: string;
}

async function apagar(tabela: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin
    .from(tabela as never)
    .delete()
    .in("id", ids);
  if (error) throw new Error(`falha ao desfazer ${tabela} ${ids.join(", ")}: ${error.message}`);
}

export function criarRotaDeAprovacao<Proposta, Resultado>(
  aprovacao: Aprovacao<Proposta, Resultado>,
) {
  return async function POST(
    request: NextRequest,
    contexto?: { params: Promise<{ studentId: string }> },
  ): Promise<NextResponse> {
    const params = contexto ? await contexto.params : {};

    const acesso = await aprovacao.acesso(request, params);
    if (!acesso.ok) return acesso.response;
    const { studentId, specialistId, sessionId } = acesso;

    const estado = await getSessionState(sessionId);
    const base = { studentId, specialistId, sessionId, estado };

    const recusa = await aprovacao.verificar?.(base);
    if (recusa) return NextResponse.json({ error: recusa.erro }, { status: recusa.status });

    const criados: string[] = [];
    let aprovada: Proposta | undefined;
    let resultado: Resultado | null;

    try {
      resultado = await aprovarProposta<Proposta, Resultado>(sessionId, aprovacao.chave, {
        gravar: async (proposta) => {
          aprovada = proposta;
          return aprovacao.gravar({ ...base, registrar: (id) => criados.push(id) }, proposta);
        },
        desfazer: () =>
          aprovacao.desfazerEm ? apagar(aprovacao.desfazerEm, criados) : Promise.resolve(),
      });
    } catch (err) {
      console.error(`[${aprovacao.rotulo}] especialista`, specialistId, err);
      return NextResponse.json({ error: "Não consegui salvar agora." }, { status: 500 });
    }

    // `null` é o segundo clique, a segunda aba e o retry que chegou depois do
    // primeiro pedido ter terminado — todos os casos em que já foi gravado.
    if (resultado === null || aprovada === undefined) {
      return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
    }

    // Sai da fila de decisão e vira histórico da tela. A chave pendente já saiu
    // do `state` na reivindicação; o que falta é o registro do que foi
    // aprovado, para o cartão reabrir marcado como salvo.
    await updateSessionState(sessionId, aprovacao.resolver(aprovada, resultado, estado));
    await saveMessage(sessionId, "assistant", aprovacao.mensagem(aprovada, resultado));

    return NextResponse.json(aprovacao.corpo(aprovada, resultado));
  };
}
