import type { BriefingStats } from "@elevapro/shared";

/**
 * Os números vivem numa faixa fina no rodapé, não em cartões de destaque.
 *
 * É a inversão que o design propõe: contagem é contexto, não a resposta. Quem
 * abre o sistema quer saber quem precisa dele hoje — isso está acima, em texto.
 */
export function StatStrip({ stats }: { stats: BriefingStats }) {
  const items: [number, string][] = [
    [stats.activeStudents, "alunos ativos"],
    [stats.workoutTemplates, "modelos de treino"],
    [stats.activeDietPlans, "dietas ativas"],
    [stats.aiSessions, "sessões de IA"],
  ];

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3 border-t border-border pt-6">
      {items.map(([value, label]) => (
        <p key={label}>
          <span className="font-display text-[22px] font-extrabold text-foreground">{value}</span>
          <span className="ml-2 text-xs text-muted-foreground">{label}</span>
        </p>
      ))}
    </div>
  );
}
