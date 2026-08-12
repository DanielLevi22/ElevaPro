"use client";

import type { Periodization } from "@elevapro/shared";
import { DataTable, type DataTableColumn } from "@/shared/components/ui/DataTable";
import { StatusBadge, type StatusTone } from "@/shared/components/ui/StatusBadge";
import { formatDateRange } from "@/shared/utils/formatDate";

interface PeriodizationsTableProps {
  periodizations: Periodization[];
  /** O aluno ve os proprios ciclos, entao repetir o nome dele em toda linha e ruido. */
  isMember: boolean;
}

const OBJECTIVE_LABEL: Record<string, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  endurance: "Resistência",
  weight_loss: "Emagrecimento",
  conditioning: "Condicionamento",
  general_fitness: "Saúde Geral",
};

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  planned: { label: "Planejada", tone: "info" },
  active: { label: "Ativa", tone: "success" },
  completed: { label: "Concluída", tone: "neutral" },
};

function phaseCount(count: number | null | undefined): string {
  const total = count ?? 0;
  return `${total} ${total === 1 ? "fase" : "fases"}`;
}

function buildColumns(isMember: boolean): DataTableColumn<Periodization>[] {
  return [
    {
      key: "name",
      header: "Nome",
      render: (p) => (
        <span className="block min-w-0">
          <span className="block text-[12.5px] font-bold text-foreground truncate">{p.name}</span>
          {!isMember && p.student && (
            <span className="block text-[11px] text-muted-foreground truncate">
              {p.student.full_name}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "objective",
      header: "Objetivo",
      width: "lg:w-28",
      render: (p) => OBJECTIVE_LABEL[p.objective ?? ""] ?? p.objective ?? "—",
    },
    {
      key: "period",
      header: "Período",
      width: "lg:w-36",
      render: (p) => formatDateRange(p.start_date, p.end_date),
    },
    {
      key: "phases",
      header: "Fases",
      width: "lg:w-20",
      render: (p) => phaseCount(p.training_plans_count),
    },
    {
      key: "status",
      header: "Status",
      width: "lg:w-24",
      keepOnMobile: true,
      render: (p) => {
        const status = STATUS[p.status] ?? STATUS.planned;
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
      },
    },
  ];
}

export function PeriodizationsTable({ periodizations, isMember }: PeriodizationsTableProps) {
  return (
    <DataTable
      breakpoint="lg"
      columns={buildColumns(isMember)}
      rows={periodizations}
      rowKey={(p) => p.id}
      rowHref={(p) => `/dashboard/workouts/periodizations/${p.id}`}
      rowLabel={(p) => `Abrir ${p.name}`}
    />
  );
}
