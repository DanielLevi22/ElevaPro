"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DeleteDietPlanModal } from "@/modules/nutrition/components/DeleteDietPlanModal";
import { DietsEmptyState } from "@/modules/nutrition/components/DietsEmptyState";
import {
  type DietStatusFilter,
  DietsFilter,
  type DietTypeFilter,
} from "@/modules/nutrition/components/DietsFilter";
import { DietsHeader } from "@/modules/nutrition/components/DietsHeader";
import { DietsTable } from "@/modules/nutrition/components/DietsTable";
import { ImportDietModal } from "@/nutrition";
import { useAuthUser, useDeleteDietPlan, useDietPlans } from "@/shared/hooks";
import { useStudents } from "@/shared/hooks/useStudents";

export default function DietsPage() {
  const router = useRouter();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DietTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DietStatusFilter>("all");

  const { data: students = [] } = useStudents();
  const { isLoading: isAuthLoading } = useAuthUser();
  const {
    data: dietPlans = [],
    isLoading: isDietsLoading,
    error: dietsError,
  } = useDietPlans(selectedStudentId);
  const deleteMutation = useDeleteDietPlan();

  const isLoading = isAuthLoading || isDietsLoading;
  const [selectedPlanForDelete, setSelectedPlanForDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setSelectedPlanForDelete(id);
  };

  const confirmDelete = async () => {
    if (!selectedPlanForDelete) return;

    try {
      await deleteMutation.mutateAsync(selectedPlanForDelete);
      toast.success("Plano excluído com sucesso.");
      setSelectedPlanForDelete(null);
    } catch (_error) {
      toast.error("Erro ao excluir plano.");
    }
  };

  const planToDelete = dietPlans.find((p) => p.id === selectedPlanForDelete);

  // O filtro por aluno já vem aplicado do hook; aqui sobram busca, tipo e status.
  const visiblePlans = useMemo(() => {
    const term = query.trim().toLowerCase();
    return dietPlans.filter((plan) => {
      if (typeFilter !== "all" && plan.plan_type !== typeFilter) return false;
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = `${plan.name ?? ""} ${plan.student?.full_name ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [dietPlans, query, typeFilter, statusFilter]);

  const hasFilter =
    !!selectedStudentId || !!query || typeFilter !== "all" || statusFilter !== "all";

  const handleCreate = () => router.push("/dashboard/diets/new");
  const handleImport = () => setIsImportModalOpen(true);

  return (
    <div className="space-y-8 relative">
      <DietsHeader onCreateClick={handleCreate} onImportClick={handleImport} />

      <DietsFilter
        query={query}
        onQueryChange={setQuery}
        selectedStudentId={selectedStudentId}
        onStudentChange={setSelectedStudentId}
        students={students}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Content */}
      {dietsError ? (
        <div className="bg-surface border border-destructive/30 rounded-2xl p-6">
          <p className="text-sm font-bold text-destructive">Não foi possível carregar as dietas</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{dietsError.message}</p>
        </div>
      ) : (
        <DietsTable
          dietPlans={visiblePlans}
          isLoading={isLoading}
          emptyState={<DietsEmptyState hasFilter={hasFilter} onCreateClick={handleCreate} />}
          onView={(id) => router.push(`/dashboard/diets/${id}`)}
          onDelete={handleDelete}
        />
      )}

      <ImportDietModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetStudentId={selectedStudentId}
      />

      <DeleteDietPlanModal
        isOpen={!!selectedPlanForDelete}
        onClose={() => setSelectedPlanForDelete(null)}
        onConfirm={confirmDelete}
        planName={planToDelete?.name || ""}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
