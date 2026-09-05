import { rotaDeIA } from "@/lib/ai-route";
import { acessoDoAluno, criarRotaDeAprovacao } from "@/modules/ai/services/rotaDeAprovacao";
import { saveStudentCoachPlan } from "@/modules/ai/services/studentCoachService";
import type { PlanProposalData } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

/**
 * Grava o plano do aluno a partir da proposta guardada no servidor.
 *
 * Antes o botão **Aprovar** mandava a frase `"Aprovado! Pode salvar o plano."`
 * pelo chat, e o modelo é que deveria chamar `save_plan`. Era o mesmo desenho
 * que travou a periodização em laço, com uma rede de segurança embaixo: a
 * ferramenta lia a cópia guardada e ignorava o que o modelo passasse, então
 * mesmo sem os dados no histórico a chamada gravava certo.
 *
 * Rede de segurança embaixo do buraco não é o buraco tapado. Funcionava
 * enquanto o modelo lembrasse de chamar a ferramenta; se ele reapresentasse o
 * plano em vez de salvar — que foi exatamente o que aconteceu na periodização —,
 * o aluno clicava em Aprovar e nada acontecia.
 *
 * Agora quem grava é a rota, pelo mesmo caminho dos outros três fluxos:
 * reivindicação atômica, e desfazer se a gravação falhar no meio.
 */
export const POST = rotaDeIA(
  criarRotaDeAprovacao<PlanProposalData, { id: string }>({
    rotulo: "POST student save-plan",
    chave: "pendingStudentPlan",
    acesso: acessoDoAluno,
    desfazerEm: "training_periodizations",

    gravar: async (ctx, plano) => {
      const id = await saveStudentCoachPlan(
        ctx.studentId,
        ctx.sessionId,
        plano.workout,
        plano.nutrition,
      );
      ctx.registrar(id);
      return { id };
    },

    resolver: (plano, { id }) => ({ resolvedStudentPlan: { plan: plano, periodizationId: id } }),

    mensagem: (plano) =>
      `✅ Plano aprovado e salvo: ${plano.workout.split_name}, ${plano.workout.duration_weeks} semanas.`,

    corpo: (plano, { id }) => ({ id, name: plano.workout.split_name }),
  }),
);
