"use client";

import type { DietPlan } from "@elevapro/shared";
import { FILTER_SELECT_CLASS, FilterBar, type FilterTab } from "@/shared/components/ui/FilterBar";

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
const STATUS_TABS: FilterTab<DietStatusFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "finished", label: "Finalizadas" },
];

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
    <FilterBar
      query={query}
      onQueryChange={onQueryChange}
      searchPlaceholder="Buscar por nome ou aluno..."
      searchLabel="Buscar por nome do plano ou do aluno"
      tabs={STATUS_TABS}
      activeTab={statusFilter}
      onTabChange={onStatusChange}
    >
      <select
        value={selectedStudentId}
        onChange={(event) => onStudentChange(event.target.value)}
        aria-label="Filtrar por aluno"
        className={`${FILTER_SELECT_CLASS} lg:w-45`}
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
        className={`${FILTER_SELECT_CLASS} lg:w-35`}
      >
        <option value="all">Todos os tipos</option>
        <option value="unique">Dieta Única</option>
        <option value="cyclic">Dieta Cíclica</option>
      </select>
    </FilterBar>
  );
}
