import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useDietPlans, useImportDiet } from "@/shared/hooks/useNutrition";
import { useStudents } from "@/shared/hooks/useStudents";

interface ImportDietModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudentId?: string;
}

export function ImportDietModal({ isOpen, onClose, targetStudentId }: ImportDietModalProps) {
  const [selectedSourceStudent, setSelectedSourceStudent] = useState("");
  const [selectedDietPlan, setSelectedDietPlan] = useState("");
  const [selectedTargetStudent, setSelectedTargetStudent] = useState(targetStudentId || "");

  const { data: students = [] } = useStudents();
  const { data: sourceDietPlans = [] } = useDietPlans(selectedSourceStudent);
  const importDietMutation = useImportDiet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDietPlan || !selectedTargetStudent) {
      toast.error("Selecione um plano e um aluno de destino");
      return;
    }

    try {
      await importDietMutation.mutateAsync({
        sourceDietPlanId: selectedDietPlan,
        targetStudentId: selectedTargetStudent,
      });

      // Reset form
      setSelectedSourceStudent("");
      setSelectedDietPlan("");
      setSelectedTargetStudent(targetStudentId || "");
      onClose();

      toast.success("Dieta importada com sucesso!");
    } catch (error: any) {
      console.error("Error importing diet:", error);
      toast.error(error.message || "Erro ao importar dieta");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Importar Dieta">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Aluno de Origem</label>
            <select
              value={selectedSourceStudent}
              onChange={(e) => {
                setSelectedSourceStudent(e.target.value);
                setSelectedDietPlan(""); // Reset diet plan when changing student
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
              <label className="text-sm font-medium text-muted-foreground">Plano de Dieta</label>
              <select
                value={selectedDietPlan}
                onChange={(e) => setSelectedDietPlan(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um plano</option>
                {sourceDietPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.status === "active" ? "Ativo" : "Inativo"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!targetStudentId && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Aluno de Destino</label>
              <select
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

          {selectedDietPlan && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">⚠️ Importante:</p>
              <p className="text-xs text-muted-foreground">
                A dieta será copiada completamente, incluindo todas as refeições e alimentos. O
                aluno de destino não pode ter um plano ativo.
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
