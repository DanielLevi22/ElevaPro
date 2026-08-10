"use client";

import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useDeleteStudent } from "../hooks/useDeleteStudent";

interface DeleteStudentModalProps {
  student: { id: string; full_name: string } | null;
  onClose: () => void;
}

export function DeleteStudentModal({ student, onClose }: DeleteStudentModalProps) {
  const deleteStudent = useDeleteStudent();

  const handleConfirm = async () => {
    if (!student) return;
    try {
      await deleteStudent.mutateAsync(student.id);
      onClose();
    } catch {
      // error shown via deleteStudent.error
    }
  };

  return (
    <Dialog
      open={!!student}
      onClose={onClose}
      title="Remover aluno"
      description={`Tem certeza que deseja remover ${student?.full_name ?? "este aluno"}? Esta ação não pode ser desfeita.`}
    >
      <div className="space-y-4">
        {deleteStudent.error && (
          <p
            role="alert"
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            {deleteStudent.error.message}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={deleteStudent.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            fullWidth
            onClick={handleConfirm}
            isLoading={deleteStudent.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {deleteStudent.isPending ? "Removendo..." : "Remover"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
