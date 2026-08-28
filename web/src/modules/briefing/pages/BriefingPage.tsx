import type { Briefing, RecentActivityItem } from "@elevapro/shared";
import { AttentionCard } from "../components/AttentionCard";
import { BriefingSummary } from "../components/BriefingSummary";
import { RecentActivity } from "../components/RecentActivity";
import { StatStrip } from "../components/StatStrip";

interface BriefingPageProps extends Briefing {
  today: string;
  recentActivity: RecentActivityItem[];
}

function NothingToDo({ hasStudents }: { hasStudents: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {hasStudents
          ? "Ninguém precisa de ação agora. Os alunos estão treinando e não há convite parado."
          : "Vincule um aluno para o briefing começar a apontar quem precisa de você."}
      </p>
    </div>
  );
}

export default function BriefingPage({ signals, stats, today, recentActivity }: BriefingPageProps) {
  return (
    <div className="w-full space-y-12">
      <BriefingSummary signals={signals} activeStudents={stats.activeStudents} today={today} />

      <section className="space-y-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Precisa da sua atenção
          {signals.length > 0 && <span className="ml-2 text-foreground">{signals.length}</span>}
        </h2>

        {signals.length === 0 ? (
          <NothingToDo hasStudents={stats.activeStudents > 0} />
        ) : (
          <div className="flex flex-wrap gap-3.5">
            {signals.map((signal, index) => (
              <AttentionCard
                key={`${signal.studentId}-${signal.kind}`}
                signal={signal}
                emphasis={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/*
        Entre os sinais e os numeros de proposito: o especialista le primeiro
        quem precisa dele, depois o que os outros fizeram. Ate aqui o briefing
        so mostrava o que estava ruim.
      */}
      <RecentActivity items={recentActivity} />

      <StatStrip stats={stats} />
    </div>
  );
}
