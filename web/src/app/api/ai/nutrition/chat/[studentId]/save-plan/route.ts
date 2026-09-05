import { rotaDeIA } from "@/lib/ai-route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  acessoDoEspecialista,
  criarRotaDeAprovacao,
  especialistaDe,
} from "@/modules/ai/services/rotaDeAprovacao";
import type { DietPlanProposal } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

const DIA_MS = 86_400_000;

function somaSemanas(isoDate: string, weeks: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`).getTime();
  return new Date(base + weeks * 7 * DIA_MS).toISOString().slice(0, 10);
}

/**
 * Grava o plano alimentar a partir da proposta guardada no servidor.
 *
 * Salva a cópia guardada, não o que o modelo reemitir — é o que garante que o
 * gravado é idêntico ao que o especialista aprovou olhando o cartão.
 */
export const POST = rotaDeIA(
  criarRotaDeAprovacao<DietPlanProposal, { id: string }>({
    rotulo: "POST save-plan",
    chave: "pendingDietPlan",
    acesso: acessoDoEspecialista("nutrition"),
    // Insert único: não existe "meio" para desfazer.

    gravar: async (ctx, plano) => {
      const { data, error } = await supabaseAdmin
        .from("diet_plans")
        .insert({
          student_id: ctx.studentId,
          specialist_id: especialistaDe(ctx),
          name: plano.name,
          plan_type: plano.plan_type,
          status: "active",
          // Período obrigatório: `DietDetailsHeader` formata estas datas, e o
          // `format` do date-fns lança com data inválida.
          start_date: plano.start_date,
          end_date: somaSemanas(plano.start_date, plano.duration_weeks),
          target_calories: plano.target_calories,
          target_protein: plano.target_protein,
          target_carbs: plano.target_carbs,
          target_fat: plano.target_fat,
          notes: plano.notes ?? null,
        })
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "insert de diet_plans não retornou");
      return { id: data.id };
    },

    resolver: (plano, { id }) => ({ savedDietPlanId: id, resolvedDietPlan: plano }),

    mensagem: (plano) =>
      `✅ Plano alimentar aprovado e salvo: ${plano.name} (${plano.target_calories} kcal/dia).`,

    corpo: (plano, { id }) => ({ id, name: plano.name }),
  }),
);
