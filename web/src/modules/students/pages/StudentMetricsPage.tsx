"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import CalendarHeatmap, { type ReactCalendarHeatmapValue } from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart";
import {
  type ExerciseOption,
  type LoadPoint,
  useExerciseLoadHistory,
  useExercisesWithHistory,
  useWorkoutMetrics,
} from "@/shared/hooks/useWorkoutMetrics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-white/10 rounded-xl p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-white/10 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-52 bg-white/5 rounded-lg animate-pulse" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-52 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Chart configs ─────────────────────────────────────────────────────────────

const loadChartConfig = {
  weight: { label: "Carga máx.", color: "#CCFF00" },
} satisfies ChartConfig;

const radarChartConfig = {
  volume: { label: "Volume", color: "#60A5FA" },
} satisfies ChartConfig;

const STIMULUS_COLORS = ["#FACC15", "#60A5FA", "#34D399"];

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1d27",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: 12,
};

// ── Heatmap overrides (injected once per render) ───────────────────────────────

const HEATMAP_STYLE = `
  .react-calendar-heatmap text { fill: #64748b; font-size: 9px; }
  .react-calendar-heatmap .color-empty { fill: rgba(255,255,255,0.05); }
  .react-calendar-heatmap .color-scale-1 { fill: rgba(204,255,0,0.25); }
  .react-calendar-heatmap .color-scale-2 { fill: rgba(204,255,0,0.50); }
  .react-calendar-heatmap .color-scale-3 { fill: rgba(204,255,0,0.75); }
  .react-calendar-heatmap .color-scale-4 { fill: #CCFF00; }
  .react-calendar-heatmap rect { rx: 2; ry: 2; }
`;

// ── Load Evolution Chart (interactive) ────────────────────────────────────────

interface ActivePoint {
  activePayload?: { payload: LoadPoint }[];
}

function LoadEvolutionChart({ studentId }: { studentId: string }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [hovered, setHovered] = useState<LoadPoint | null>(null);

  const { data: exercises = [] } = useExercisesWithHistory(studentId);
  const activeExercise = selectedExercise ?? exercises[0]?.id ?? null;
  const { data: loadHistory = [], isLoading } = useExerciseLoadHistory(studentId, activeExercise);

  const latest = loadHistory[loadHistory.length - 1] ?? null;
  const first = loadHistory[0] ?? null;
  const display = hovered ?? latest;
  const delta = latest && first ? latest.weight - first.weight : 0;

  return (
    <div className="bg-surface border border-white/10 rounded-xl p-6">
      {/* Interactive header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Evolução de Carga
          </p>
          {isLoading ? (
            <div className="h-10 w-32 bg-white/5 rounded animate-pulse mt-1" />
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-foreground">
                  {display ? `${display.weight} kg` : "—"}
                </span>
                {!hovered && delta !== 0 && (
                  <span
                    className={`text-sm font-semibold ${delta > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta} kg
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hovered ? hovered.date : latest ? `última sessão · ${latest.date}` : "sem dados"}
              </p>
            </>
          )}
        </div>

        {exercises.length > 0 && (
          <select
            value={activeExercise ?? ""}
            onChange={(e) => {
              setSelectedExercise(e.target.value || null);
              setHovered(null);
            }}
            className="bg-background border border-white/10 text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(exercises as ExerciseOption[]).map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : !loadHistory.length ? (
        <EmptyState message="Nenhum histórico de carga disponível." />
      ) : (
        <ChartContainer config={loadChartConfig} className="h-52 w-full">
          <LineChart
            data={loadHistory}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state: ActivePoint) => {
              const point = state.activePayload?.[0]?.payload;
              if (point) setHovered(point);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="kg"
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => [`${v} kg`, "Carga máx."]} />}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#CCFF00"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#CCFF00", strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}

// ── Workout Metrics Tab ────────────────────────────────────────────────────────

function WorkoutMetricsTab({ studentId }: { studentId: string }) {
  const [days, setDays] = useState<90 | 180 | 365>(365);

  const { data: metrics, isLoading } = useWorkoutMetrics(studentId, days);
  const endDate = new Date();
  const startDate = daysAgo(days);

  const heatmapValues = (metrics?.dailyFrequency ?? []).map((d) => ({
    date: d.date,
    count: d.count,
  }));

  return (
    <div className="space-y-6">
      <style>{HEATMAP_STYLE}</style>

      {/* Period selector */}
      <div className="flex gap-2">
        {([90, 180, 365] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {d === 365 ? "1 ano" : `${d} dias`}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Treinos realizados"
          value={isLoading ? "—" : String(metrics?.totalSessions ?? 0)}
          sub={`nos últimos ${days === 365 ? "12 meses" : `${days} dias`}`}
        />
        <StatCard
          label="Volume total"
          value={
            isLoading
              ? "—"
              : metrics?.totalVolume
                ? `${(metrics.totalVolume / 1000).toFixed(1)}t`
                : "0 kg"
          }
          sub="peso × reps acumulado"
        />
        <StatCard
          label="Músculo mais treinado"
          value={isLoading ? "—" : (metrics?.topMuscle ?? "—")}
          sub="por volume total"
        />
      </div>

      {/* Heatmap — full width */}
      <ChartCard title="Consistência de Treinos">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={heatmapValues}
              classForValue={(value: ReactCalendarHeatmapValue<string> | undefined) => {
                if (!value || value.count === 0) return "color-empty";
                if (value.count === 1) return "color-scale-1";
                if (value.count === 2) return "color-scale-2";
                if (value.count === 3) return "color-scale-3";
                return "color-scale-4";
              }}
              showWeekdayLabels
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Menos</span>
              {[
                "rgba(255,255,255,0.05)",
                "rgba(204,255,0,0.25)",
                "rgba(204,255,0,0.50)",
                "rgba(204,255,0,0.75)",
                "#CCFF00",
              ].map((c) => (
                <span
                  key={c}
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ backgroundColor: c, border: "1px solid rgba(255,255,255,0.08)" }}
                />
              ))}
              <span className="text-xs text-muted-foreground">Mais</span>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Radar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar — muscle balance */}
        <ChartCard title="Equilíbrio Muscular">
          {isLoading ? (
            <ChartSkeleton />
          ) : !metrics?.volumeByMuscle.length ? (
            <EmptyState message="Sem dados de volume ainda." />
          ) : (
            <ChartContainer config={radarChartConfig} className="h-65 w-full">
              <RadarChart
                data={metrics.volumeByMuscle}
                margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
              >
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="muscle" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Radar
                  dataKey="volume"
                  stroke="#60A5FA"
                  fill="#60A5FA"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v) => [`${Number(v).toLocaleString("pt-BR")} kg·rep`, "Volume"]}
                    />
                  }
                />
              </RadarChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* Donut — stimulus distribution */}
        <ChartCard title="Distribuição de Estímulo">
          {isLoading ? (
            <ChartSkeleton />
          ) : !metrics?.stimulus.length ? (
            <EmptyState message="Nenhuma série registrada ainda." />
          ) : (
            <div className="flex items-center gap-6 h-65">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.stimulus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {metrics.stimulus.map((s, i) => (
                      <Cell key={s.name} fill={STIMULUS_COLORS[i % STIMULUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-4 flex-1">
                {metrics.stimulus.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STIMULUS_COLORS[i % STIMULUS_COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">{s.name}</span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: STIMULUS_COLORS[i % STIMULUS_COLORS.length] }}
                        >
                          {s.value}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.name === "Força" && "≤ 6 reps"}
                        {s.name === "Hipertrofia" && "7–12 reps"}
                        {s.name === "Resistência" && "≥ 13 reps"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <LoadEvolutionChart studentId={studentId} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type MetricsTab = "workouts" | "nutrition";

export default function StudentMetricsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [activeTab, setActiveTab] = useState<MetricsTab>("workouts");

  const tabs: { id: MetricsTab; label: string; soon?: boolean }[] = [
    { id: "workouts", label: "Treinos" },
    { id: "nutrition", label: "Nutrição", soon: true },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Métricas</h1>
        <p className="text-muted-foreground mt-1">Evolução e desempenho do aluno.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.soon && setActiveTab(tab.id)}
            disabled={tab.soon}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : tab.soon
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.soon && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground/60">
                Em breve
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "workouts" && <WorkoutMetricsTab studentId={studentId} />}
    </div>
  );
}
