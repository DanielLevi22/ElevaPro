import dynamic from "next/dynamic";

// recharts + react-calendar-heatmap sao pesados e so existem nesta aba. Carregar
// sob demanda tira o custo delas do bundle das outras abas do aluno.
const StudentMetricsPage = dynamic(() => import("@/modules/students/pages/StudentMetricsPage"), {
  loading: () => (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-40 rounded bg-overlay-10 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 rounded-xl bg-overlay-05 animate-pulse" />
        <div className="h-28 rounded-xl bg-overlay-05 animate-pulse" />
        <div className="h-28 rounded-xl bg-overlay-05 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-overlay-05 animate-pulse" />
    </div>
  ),
});

export default function Page() {
  return <StudentMetricsPage />;
}
