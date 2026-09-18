import { rotaDeIA } from "@/lib/ai-route";
import { savePeriodization } from "@/modules/ai/services/chatService";
import {
  acessoDoEspecialista,
  criarRotaDeAprovacao,
  especialistaDe,
} from "@/modules/ai/services/rotaDeAprovacao";
import type { PeriodizationProposal } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

/**
 * Grava a periodização a partir da proposta guardada no servidor.
 *
 * Antes a aprovação era uma frase no chat — `"Aprovado! Pode salvar"` — e o
 * modelo é que deveria chamar `save_periodization`. Só que o histórico que ele
 * relê tem apenas texto: chamada de ferramenta e resultado não são gravados.
 * Ele chegava ao turno seguinte sem nome, semanas, data nem fases, propunha de
 * novo para reconstruí-los, a rota respondia "aguardando aprovação", e ele
 * pedia que se aprovasse outra vez. Sem fim.
 */
export const POST = rotaDeIA(
  criarRotaDeAprovacao<PeriodizationProposal, { id: string }>({
    rotulo: "POST save-periodization",
    chave: "pendingPeriodization",
    acesso: acessoDoEspecialista("workout"),
    desfazerEm: "training_periodizations",

    gravar: async (ctx, proposta) => {
      const id = await savePeriodization(ctx.studentId, especialistaDe(ctx), proposta);
      ctx.registrar(id);
      return { id };
    },

    resolver: (proposta, { id }) => ({ resolvedPeriodization: { proposal: proposta, id } }),

    mensagem: (proposta) =>
      `✅ Periodização aprovada e salva: ${proposta.name} (${proposta.durationWeeks} semanas, ${proposta.phases.length} fases). Podemos montar os treinos da primeira fase.`,

    corpo: (proposta, { id }) => ({ id, name: proposta.name }),
  }),
);
