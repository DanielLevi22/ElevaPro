import type { NextBlockPending } from "@elevapro/shared";
import { withAiRoute } from "@/lib/ai-route";
import { saveNextBlock } from "@/modules/ai/services/practitionerPlan/saveNextBlock";
import { acessoDoAluno, criarRotaDeAprovacao } from "@/modules/ai/services/rotaDeAprovacao";

export const maxDuration = 60;

/**
 * B5 · "Aprovar Bloco N" (#376): grava o próximo bloco a partir da cópia
 * pendente, a mesma que a pessoa viu (ADR-0020), e encerra o anterior com o
 * motivo. Se falhar no meio, o desfazer apaga o novo e o anterior continua.
 */
export const POST = withAiRoute(
  criarRotaDeAprovacao<NextBlockPending, { periodizationId: string; dietPlanId: string | null }>({
    rotulo: "POST student next block approve",
    chave: "pendingNextBlock",
    acesso: acessoDoAluno,
    // Treinos, exercícios e fase caem por cascata a partir da periodização.
    desfazerEm: "training_periodizations",

    gravar: (ctx, pending) => {
      // `acessoDoAluno` sempre entrega o titular; sem ele, falhar alto.
      if (!ctx.titular) throw new Error("aprovação do próximo bloco sem a sessão do aluno");
      return saveNextBlock(
        { studentId: ctx.studentId, titular: ctx.titular(), registrar: ctx.registrar },
        pending,
      );
    },

    resolver: (_pending, result) => ({ resolvedNextBlock: result }),

    // Trocado antes do fim (C2), o atual fecha hoje e o novo começa amanhã.
    mensagem: (pending) =>
      `✅ Bloco ${pending.blockNumber} aprovado: começa ${pending.early ? "amanhã" : "hoje"}.`,

    corpo: (_pending, result) => result,
  }),
);
