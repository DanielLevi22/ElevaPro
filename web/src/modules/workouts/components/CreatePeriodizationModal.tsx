"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { DateField } from "@/shared/components/ui/DateField";
import { Dialog } from "@/shared/components/ui/Dialog";
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
  const objetivoId = useId();
  const alunoId = useId();
  const nomeId = useId();
  const isEditing = !!periodizationId;
  const isMemberMode = !!memberStudentId;

  const [name, setName] = useState("");
  const [objective, setObjective] = useState<PeriodizationObjective>("hypertrophy");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar Periodização" : "Nova Periodização"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label htmlFor={nomeId} className="block text-sm font-medium text-muted-foreground mb-1">
            Nome <span className="text-destructive">*</span>
          </label>
          <input
            id={nomeId}
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
            <label
              htmlFor={alunoId}
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Aluno <span className="text-destructive">*</span>
            </label>
            <select
              id={alunoId}
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
          <span id={objetivoId} className="block text-sm font-medium text-muted-foreground mb-2">
            Objetivo <span className="text-destructive">*</span>
          </span>
          <fieldset className="grid grid-cols-3 gap-2" aria-labelledby={objetivoId}>
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
          </fieldset>
        </div>

        {/* Datas — o fim nao pode anteceder o inicio, e DateField ja limita a faixa */}
        <div className="grid grid-cols-2 gap-4">
          <DateField label="Início" value={startDate} onChange={setStartDate} required />
          <DateField
            label="Fim"
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
            required
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? "Salvar" : "Criar Periodização"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
