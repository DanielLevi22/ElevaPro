import type { SimplerDietPending } from "@elevapro/shared";
import { withAiRoute } from "@/lib/ai-route";
import { saveSimplerDiet } from "@/modules/ai/services/practitionerPlan/simplerDiet";
import { acessoDoAluno, criarRotaDeAprovacao } from "@/modules/ai/services/rotaDeAprovacao";

export const maxDuration = 60;

/**
 * A5c · "Aprovar cardápio" (#376): grava o plano mais simples a partir da
 * cópia pendente, a mesma que a pessoa viu (ADR-0020), e registra o ajuste,
 * que fecha o check-in. Se falhar no meio, a dieta nova sai e a anterior fica.
 */
export const POST = withAiRoute(
  criarRotaDeAprovacao<SimplerDietPending, { dietPlanId: string }>({
    rotulo: "POST student simpler diet approve",
    chave: "pendingSimplerDiet",
    acesso: acessoDoAluno,
    desfazerEm: "diet_plans",

    gravar: (ctx, pending) => {
      // `acessoDoAluno` sempre entrega o titular; sem ele, falhar alto.
      if (!ctx.titular) throw new Error("plano mais simples sem a sessão do aluno");
      return saveSimplerDiet(
        { studentId: ctx.studentId, titular: ctx.titular(), registrar: ctx.registrar },
        pending,
      );
    },

    resolver: (_pending, result) => ({ resolvedSimplerDiet: result }),

    mensagem: (pending) =>
      `✅ Plano mais simples aprovado: ${pending.mealsAfter} refeições por dia, a mesma meta.`,

    corpo: (_pending, result) => result,
  }),
);
