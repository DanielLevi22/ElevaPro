"use client";

import type { DietPlan } from "@elevapro/shared";
import { Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/ui/DataTable";
import { StatusBadge, type StatusTone } from "@/shared/components/ui/StatusBadge";
import { formatDateRange } from "@/shared/utils/formatDate";

/** O service anexa o perfil do aluno ao plano — ver nutrition.service.fetchDietPlans. */
export type DietPlanWithStudent = DietPlan & {
  student?: { id: string; full_name: string };
};

interface DietsTableProps {
  dietPlans: DietPlanWithStudent[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

const STATUS: Record<DietPlan["status"], { label: string; tone: StatusTone }> = {
  active: { label: "Ativo", tone: "success" },
  finished: { label: "Finalizado", tone: "neutral" },
};

function planName(plan: DietPlanWithStudent): string {
  return plan.name ?? "Plano sem nome";
}

function formatMacros(plan: DietPlan): string {
  if (plan.target_calories === null) return "—";
  return `${plan.target_calories} kcal · P${plan.target_protein ?? 0} C${plan.target_carbs ?? 0} G${plan.target_fat ?? 0}`;
}

const COLUMNS: DataTableColumn<DietPlanWithStudent>[] = [
  {
    key: "plan",
    header: "Plano",
    render: (plan) => (
      <span className="block min-w-0">
        <span className="block text-[12.5px] font-bold text-foreground truncate">
          {planName(plan)}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5">
          <span className="w-4.5 h-4.5 shrink-0 rounded-full bg-surface-highlight border border-overlay-08 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
            {(plan.student?.full_name ?? "Aluno sem nome").charAt(0).toUpperCase()}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {plan.student?.full_name ?? "Aluno sem nome"}
          </span>
        </span>
      </span>
    ),
  },
  {
    key: "type",
    header: "Tipo",
    width: "md:w-20",
    render: (plan) => (plan.plan_type === "unique" ? "Única" : "Cíclica"),
  },
  {
    key: "macros",
    header: "Macros",
    width: "md:w-40",
    render: (plan) => formatMacros(plan),
  },
  {
    key: "period",
    header: "Período",
    width: "md:w-32",
    render: (plan) => formatDateRange(plan.start_date, plan.end_date),
  },
  {
    key: "status",
    header: "Status",
    width: "md:w-24",
    keepOnMobile: true,
    render: (plan) => {
      const status = STATUS[plan.status];
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
  },
];

export function DietsTable({
  dietPlans,
  onView,
  onDelete,
  isLoading,
  emptyState,
}: DietsTableProps) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={dietPlans}
      isLoading={isLoading}
      emptyState={emptyState}
      rowKey={(plan) => plan.id}
      onRowClick={(plan) => onView(plan.id)}
      rowLabel={(plan) => `Abrir ${planName(plan)}`}
      rowAction={(plan) => (
        <button
          type="button"
          onClick={() => onDelete(plan.id)}
          aria-label={`Excluir ${planName(plan)}`}
          title="Excluir"
          className="p-1 rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    />
  );
}
