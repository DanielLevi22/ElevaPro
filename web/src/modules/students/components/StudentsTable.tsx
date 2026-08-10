"use client";

import type { Student } from "@elevapro/shared";
import { ChevronRight } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/ui/DataTable";
import { StatusBadge, type StatusTone } from "@/shared/components/ui/StatusBadge";

interface StudentsTableProps {
  students: Student[];
}

const STATUS: Record<Student["account_status"], { label: string; tone: StatusTone }> = {
  active: { label: "Ativo", tone: "success" },
  invited: { label: "Pendente", tone: "warning" },
  inactive: { label: "Inativo", tone: "neutral" },
};

function studentName(student: Student): string {
  return student.full_name ?? "Aluno sem nome";
}

const COLUMNS: DataTableColumn<Student>[] = [
  {
    key: "name",
    header: "Nome",
    render: (student) => (
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 shrink-0 rounded-full bg-surface-highlight border border-overlay-08 flex items-center justify-center text-xs font-bold text-muted-foreground">
          {studentName(student).charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-bold text-foreground truncate">
            {studentName(student)}
          </span>
          <span className="block text-[11px] text-muted-foreground truncate">{student.email}</span>
        </span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "md:w-24",
    keepOnMobile: true,
    render: (student) => {
      const status = STATUS[student.account_status];
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    },
  },
];

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={students}
      rowKey={(student) => student.id}
      rowHref={(student) => `/dashboard/students/${student.id}`}
      rowLabel={(student) => `Abrir ${studentName(student)}`}
      rowAction={() => <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    />
  );
}
