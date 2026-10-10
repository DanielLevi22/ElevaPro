import { withAiRoute } from "@/lib/ai-route";
import { savePractitionerPlan } from "@/modules/ai/services/practitionerPlan/savePlan";
import type { OnboardingPlanPending } from "@/modules/ai/services/practitionerPlan/types";
import { acessoDoAluno, criarRotaDeAprovacao } from "@/modules/ai/services/rotaDeAprovacao";

export const maxDuration = 60;

/**
 * O9 · "Aprovar plano": grava o plano do onboarding a partir da cópia pendente,
 * a mesma que a pessoa viu (ADR-0020). Treino ativo e, se a triagem liberou,
 * dieta ativa.
 */
export const POST = withAiRoute(
  criarRotaDeAprovacao<
    OnboardingPlanPending,
    { periodizationId: string; dietPlanId: string | null }
  >({
    rotulo: "POST student onboarding approve",
    chave: "pendingOnboardingPlan",
    acesso: acessoDoAluno,
    // Treinos, exercícios e fase caem por cascata a partir da periodização.
    desfazerEm: "training_periodizations",

    gravar: (ctx, pendente) => {
      // `acessoDoAluno` sempre entrega o titular; sem ele, falhar alto.
      if (!ctx.titular) throw new Error("aprovação do onboarding sem a sessão do aluno");
      return savePractitionerPlan(
        { studentId: ctx.studentId, titular: ctx.titular(), registrar: ctx.registrar },
        pendente,
      );
    },

    resolver: (_pendente, resultado) => ({ resolvedOnboardingPlan: resultado }),

    mensagem: (pendente) =>
      pendente.target
        ? "✅ Plano aprovado: seu treino e sua dieta já estão ativos."
        : "✅ Plano aprovado: seu treino já está ativo.",

    corpo: (_pendente, resultado) => resultado,
  }),
);
