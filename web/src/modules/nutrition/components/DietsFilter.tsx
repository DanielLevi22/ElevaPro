"use client";

import type { DietPlan } from "@elevapro/shared";
import { Search } from "lucide-react";

export type DietStatusFilter = "all" | DietPlan["status"];
export type DietTypeFilter = "all" | DietPlan["plan_type"];

interface DietsFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  selectedStudentId: string;
  onStudentChange: (id: string) => void;
  students: { id: string; full_name: string | null }[];
  typeFilter: DietTypeFilter;
  onTypeChange: (value: DietTypeFilter) => void;
  statusFilter: DietStatusFilter;
  onStatusChange: (value: DietStatusFilter) => void;
}

// Só `active` e `finished` existem em DietPlanStatus — o design previa também
// "Rascunhos" e "Concluídas", que não têm correspondente no schema.
const STATUS_TABS: { value: DietStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "finished", label: "Finalizadas" },
];

const SELECT_CLASS =
  "bg-surface border border-border rounded-[10px] px-3 py-2.5 text-[13px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

export function DietsFilter({
  query,
  onQueryChange,
  selectedStudentId,
  onStudentChange,
  students,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
}: DietsFilterProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.75 h-3.75 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nome ou aluno..."
          aria-label="Buscar por nome do plano ou do aluno"
          className="w-full py-2.5 pl-9 pr-3 rounded-[10px] border border-border bg-surface text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
      </div>

      <select
        value={selectedStudentId}
        onChange={(event) => onStudentChange(event.target.value)}
        aria-label="Filtrar por aluno"
        className={`${SELECT_CLASS} lg:w-45`}
      >
        <option value="">Todos os alunos</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.full_name ?? "Aluno"}
          </option>
        ))}
      </select>

      <select
        value={typeFilter}
        onChange={(event) => onTypeChange(event.target.value as DietTypeFilter)}
        aria-label="Filtrar por tipo de dieta"
        className={`${SELECT_CLASS} lg:w-35`}
      >
        <option value="all">Todos os tipos</option>
        <option value="unique">Dieta Única</option>
        <option value="cyclic">Dieta Cíclica</option>
      </select>

      <div className="flex gap-1.5" role="group" aria-label="Filtrar por status">
        {STATUS_TABS.map((tab) => {
          const isSelected = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              aria-pressed={isSelected}
              className={`px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-bold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isSelected
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
