"use client";

import { useWorkoutMetrics } from "@/shared/hooks/useWorkoutMetrics";
import { useCurrentStudentId } from "../hooks/useStudentDashboardData";

export function StudentProgressPage() {
  const studentId = useCurrentStudentId();
  const { data: metrics, isLoading } = useWorkoutMetrics(studentId ?? "", 90);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Progresso</h1>
        <p className="text-sm text-muted-foreground mt-1">Últimos 90 dias de treino</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface/40 border border-overlay-08 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Sessões" value={metrics?.totalSessions ?? 0} unit="treinos" />
            <MetricCard label="Volume total" value={metrics?.totalVolume ?? 0} unit="kg" />
            <MetricCard label="Músculo destaque" value={metrics?.topMuscle ?? "—"} unit="" />
            <MetricCard
              label="Frequência"
              value={metrics?.weeklyFrequency.length ?? 0}
              unit="semanas ativas"
            />
          </div>

          {(metrics?.stimulus ?? []).length > 0 && (
            <div className="bg-surface/40 border border-overlay-08 rounded-2xl p-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Distribuição de estímulo
              </p>
              <div className="flex flex-col gap-3">
                {(metrics?.stimulus ?? []).map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-20 shrink-0">
                      {s.name}
                    </span>
                    <div className="flex-1 h-2 bg-surface-highlight rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${s.value}%`, backgroundColor: s.color }}
                      />
                    </div>
                    <span className="text-xs font-black text-muted-foreground w-10 text-right">
                      {s.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="bg-surface/40 border border-overlay-08 rounded-2xl p-5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      {unit && <p className="text-[10px] text-muted-foreground font-bold mt-1">{unit}</p>}
    </div>
  );
}
