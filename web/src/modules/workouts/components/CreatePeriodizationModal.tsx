"use client";

import { useEffect, useState } from "react";
import {
  type CreatePeriodizationInput,
  useCreatePeriodization,
  useUpdatePeriodization,
} from "@/shared/hooks/usePeriodizationMutations";
import type { PeriodizationObjective } from "@/shared/hooks/usePeriodizations";
import { useStudents } from "@/shared/hooks/useStudents";

const OBJECTIVES: { value: PeriodizationObjective; label: string }[] = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "strength", label: "Força" },
  { value: "endurance", label: "Resistência" },
  { value: "weight_loss", label: "Emagrecimento" },
  { value: "conditioning", label: "Condicionamento" },
  { value: "general_fitness", label: "Saúde Geral" },
];

interface InitialData {
  name: string;
  objective: PeriodizationObjective;
  student_id: string;
  start_date: string;
  end_date: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Quando fornecido, modal opera em modo de edição */
  periodizationId?: string;
  initialData?: InitialData;
  /** Quando fornecido, o membro cria para si mesmo — oculta seletor de aluno */
  memberStudentId?: string;
}

export function CreatePeriodizationModal({
  isOpen,
  onClose,
  onSuccess,
  periodizationId,
  initialData,
  memberStudentId,
}: Props) {
  const isEditing = !!periodizationId;
  const isMemberMode = !!memberStudentId;

  const [name, setName] = useState("");
  const [objective, setObjective] = useState<PeriodizationObjective>("hypertrophy");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? "");
      setObjective(initialData?.objective ?? "hypertrophy");
      setStudentId(memberStudentId ?? initialData?.student_id ?? "");
      setStartDate(initialData?.start_date?.split("T")[0] ?? "");
      setEndDate(initialData?.end_date?.split("T")[0] ?? "");
    }
  }, [isOpen, initialData, memberStudentId]);

  const { data: students = [] } = useStudents();
  const createMutation = useCreatePeriodization();
  const updateMutation = useUpdatePeriodization();

  const activeStudents = students.filter(
    (s) => s.account_status === "active" || s.account_status === "invited",
  );

  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentId || !startDate || !endDate) return;

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: periodizationId,
        data: {
          name,
          objective,
          start_date: startDate,
          end_date: endDate,
        },
      });
    } else {
      const input: CreatePeriodizationInput = {
        name,
        objective,
        student_id: studentId,
        start_date: startDate,
        end_date: endDate,
        notes: notes || undefined,
      };
      await createMutation.mutateAsync(input);
    }

    handleClose();
    onSuccess?.();
  };

  const handleClose = () => {
    setName("");
    setObjective("hypertrophy");
    setStudentId("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-overlay-10 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-overlay-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? "Editar Periodização" : "Nova Periodização"}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Nome <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hipertrofia - Ciclo 1"
              required
              className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Aluno — oculto para membros (sempre são eles mesmos) */}
          {!isMemberMode && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Aluno <span className="text-destructive">*</span>
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecionar aluno...</option>
                {activeStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Objetivo */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Objetivo <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => setObjective(obj.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    objective === obj.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-overlay-10 text-muted-foreground hover:bg-overlay-05"
                  }`}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Início <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Fim <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {isEditing ? "Salvar" : "Criar Periodização"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
