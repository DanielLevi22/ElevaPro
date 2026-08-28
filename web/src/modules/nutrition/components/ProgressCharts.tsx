"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDietLogs, useNutritionProgress } from "@/shared/hooks/useNutrition";

interface ProgressChartsProps {
  studentId: string;
  startDate?: string;
  endDate?: string;
}

/** Uma barra do gráfico de macros: um dia, com os quatro macros somados. */
interface MacroPorDia {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fullDate: string;
}

/** Uma barra do gráfico de aderência: refeições registradas e concluídas no dia. */
interface AderenciaPorDia {
  date: string;
  total: number;
  completed: number;
  fullDate: string;
}

export function ProgressCharts({ studentId, startDate, endDate }: ProgressChartsProps) {
  const { data: dietLogs = [], isLoading: logsLoading } = useDietLogs(
    studentId,
    startDate,
    endDate,
  );
  const { data: nutritionProgress = [], isLoading: progressLoading } = useNutritionProgress(
    studentId,
    startDate,
    endDate,
  );

  if (logsLoading || progressLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-white/10 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-white/10 rounded w-1/4 mb-4" />
            <div className="h-64 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Prepare weight data
  const weightData = nutritionProgress.map((entry) => ({
    date: format(new Date(entry.recorded_date), "dd/MM", { locale: ptBR }),
    weight: entry.weight || 0,
    fullDate: entry.recorded_date,
  }));

  // Prepare macro consumption data (aggregate by date)
  const macroData = dietLogs.reduce<MacroPorDia[]>((acc, log) => {
    const dateStr = format(new Date(log.logged_date), "dd/MM", { locale: ptBR });
    const existing = acc.find((item) => item.date === dateStr);
    const items = log.actual_items as Record<string, number> | null;

    if (existing) {
      existing.calories += items?.calories || 0;
      existing.protein += items?.protein || 0;
      existing.carbs += items?.carbs || 0;
      existing.fat += items?.fat || 0;
    } else {
      acc.push({
        date: dateStr,
        calories: items?.calories || 0,
        protein: items?.protein || 0,
        carbs: items?.carbs || 0,
        fat: items?.fat || 0,
        fullDate: log.logged_date,
      });
    }
    return acc;
  }, []);

  // Prepare adherence data (meals completed per day)
  const adherenceData = dietLogs.reduce<AderenciaPorDia[]>((acc, log) => {
    const dateStr = format(new Date(log.logged_date), "dd/MM", { locale: ptBR });
    const existing = acc.find((item) => item.date === dateStr);

    if (existing) {
      existing.total += 1;
      if (log.completed) existing.completed += 1;
    } else {
      acc.push({
        date: dateStr,
        total: 1,
        completed: log.completed ? 1 : 0,
        fullDate: log.logged_date,
      });
    }
    return acc;
  }, []);

  // Calculate adherence percentage
  const adherencePercentageData = adherenceData.map((item) => ({
    ...item,
    adherence: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Weight Evolution Chart */}
      {weightData.length > 0 && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Evolução de Peso</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#a0aec0" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#00ff88"
                strokeWidth={2}
                dot={{ fill: "#00ff88", r: 4 }}
                activeDot={{ r: 6 }}
                name="Peso (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Macro Consumption Chart */}
      {macroData.length > 0 && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Consumo de Macros</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#a0aec0" }}
              />
              <Legend wrapperStyle={{ color: "#a0aec0" }} iconType="circle" />
              <Area
                type="monotone"
                dataKey="protein"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Proteína (g)"
              />
              <Area
                type="monotone"
                dataKey="carbs"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Carboidratos (g)"
              />
              <Area
                type="monotone"
                dataKey="fat"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
                name="Gorduras (g)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Adherence Chart */}
      {adherencePercentageData.length > 0 && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Aderência à Dieta</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={adherencePercentageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "12px" }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1f2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#a0aec0" }}
                formatter={(value: number) => `${value}%`}
              />
              <Bar dataKey="adherence" fill="#00ff88" radius={[8, 8, 0, 0]} name="Aderência (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {weightData.length === 0 &&
        macroData.length === 0 &&
        adherencePercentageData.length === 0 && (
          <div className="bg-surface border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Sem dados de progresso</h3>
            <p className="text-muted-foreground">
              Não há registros de progresso para o período selecionado.
            </p>
          </div>
        )}
    </div>
  );
}
