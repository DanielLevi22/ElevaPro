"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { Input } from "@/shared/components/ui/Input";
import { useDietPlans, useImportDiet } from "@/shared/hooks/useNutrition";
import { useStudents } from "@/shared/hooks/useStudents";

interface ImportDietModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudentId?: string;
}

export function ImportDietModal({ isOpen, onClose, targetStudentId }: ImportDietModalProps) {
  const router = useRouter();
  const targetStudentFieldId = useId();
  const sourceStudentFieldId = useId();
  const dietPlanFieldId = useId();
  const planNameFieldId = useId();
  const [planName, setPlanName] = useState("");
  const [selectedSourceStudent, setSelectedSourceStudent] = useState("");
  const [selectedDietPlan, setSelectedDietPlan] = useState("");
  const [selectedTargetStudent, setSelectedTargetStudent] = useState(targetStudentId || "");

  const { data: students = [] } = useStudents();
  const { data: sourceDietPlans = [] } = useDietPlans(selectedSourceStudent);
  const importDietMutation = useImportDiet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importDietMutation.isPending) return;

    if (!selectedDietPlan || !selectedTargetStudent || !planName.trim()) {
      toast.error("Selecione um plano, um aluno de destino e informe o novo nome");
      return;
    }

    try {
      const draft = await importDietMutation.mutateAsync({
        sourceDietPlanId: selectedDietPlan,
        targetStudentId: selectedTargetStudent,
        name: planName.trim(),
      });

      setSelectedSourceStudent("");
      setSelectedDietPlan("");
      setSelectedTargetStudent(targetStudentId || "");
      setPlanName("");
      onClose();

      toast.success("Rascunho criado. Revise as refeições antes de enviar.");
      router.push(`/dashboard/diets/${draft.id}`);
    } catch {
      toast.error("Não foi possível copiar a dieta. Tente novamente.");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Importar Dieta">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor={sourceStudentFieldId}
              className="text-sm font-medium text-muted-foreground"
            >
              Aluno de Origem
            </label>
            <select
              id={sourceStudentFieldId}
              value={selectedSourceStudent}
              onChange={(e) => {
                setSelectedSourceStudent(e.target.value);
                setSelectedDietPlan("");
              }}
              className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Selecione um aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </div>

          {selectedSourceStudent && (
            <div className="space-y-2">
              <label
                htmlFor={dietPlanFieldId}
                className="text-sm font-medium text-muted-foreground"
              >
                Plano de Dieta
              </label>
              <select
                id={dietPlanFieldId}
                value={selectedDietPlan}
                onChange={(e) => setSelectedDietPlan(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um plano</option>
                {sourceDietPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (
                    {plan.status === "active"
                      ? "Ativo"
                      : plan.status === "draft"
                        ? "Rascunho"
                        : "Finalizado"}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}

          {!targetStudentId && (
            <div className="space-y-2">
              <label
                htmlFor={targetStudentFieldId}
                className="text-sm font-medium text-muted-foreground"
              >
                Aluno de Destino
              </label>
              <select
                id={targetStudentFieldId}
                value={selectedTargetStudent}
                onChange={(e) => setSelectedTargetStudent(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um aluno</option>
                {students
                  .filter((s) => s.id !== selectedSourceStudent)
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor={planNameFieldId} className="text-sm font-medium text-muted-foreground">
              Nome do novo plano
            </label>
            <Input
              id={planNameFieldId}
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              placeholder="Ex.: Cutting fase 2"
              required
              disabled={importDietMutation.isPending}
            />
          </div>

          {selectedDietPlan && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">⚠️ Importante:</p>
              <p className="text-xs text-muted-foreground">
                Metas, refeições e alimentos serão copiados para um rascunho, sem nome, notas ou
                restrições do aluno de origem. A dieta atual do destino continua ativa até você
                enviar a nova.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={importDietMutation.isPending}>
            {importDietMutation.isPending ? "Importando..." : "Importar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
