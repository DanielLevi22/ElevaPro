"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { DateField } from "@/shared/components/ui/DateField";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useCreateTrainingPlan } from "@/shared/hooks/useTrainingPlanMutations";

type TrainingSplit =
  | "abc"
  | "abcd"
  | "abcde"
  | "upper_lower"
  | "full_body"
  | "push_pull_legs"
  | "custom";

interface CreateTrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodizationId: string;
}

const trainingSplits: { value: TrainingSplit; label: string; description: string }[] = [
  { value: "abc", label: "ABC", description: "3 treinos diferentes" },
  { value: "abcd", label: "ABCD", description: "4 treinos diferentes" },
  { value: "abcde", label: "ABCDE", description: "5 treinos diferentes" },
  { value: "upper_lower", label: "Superior/Inferior", description: "Divisão por região" },
  { value: "full_body", label: "Full Body", description: "Corpo inteiro" },
  { value: "push_pull_legs", label: "Push/Pull/Legs", description: "Empurrar/Puxar/Pernas" },
  { value: "custom", label: "Personalizado", description: "Divisão customizada" },
];

export function CreateTrainingPlanModal({
  isOpen,
  onClose,
  periodizationId,
}: CreateTrainingPlanModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit>("abc");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  const createMutation = useCreateTrainingPlan();
  const isLoading = createMutation.isPending;

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !startDate || !endDate) return;

    try {
      await createMutation.mutateAsync({
        periodization_id: periodizationId,
        name,
        start_date: startDate,
        end_date: endDate,
      });

      // Reset form
      setName("");
      setDescription("");
      setTrainingSplit("abc");
      setWeeklyFrequency(3);
      setStartDate("");
      setEndDate("");
      setNotes("");
      setGoals([]);
      setNewGoal("");

      onClose();
    } catch (error) {
      console.error("Error creating training plan:", error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Nova Ficha de Treino" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Nome da Ficha *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ficha ABC - Semanas 1-4"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            required
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o objetivo desta ficha..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Training Split */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Divisão de Treino *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {trainingSplits.map((split) => (
              <button
                key={split.value}
                type="button"
                onClick={() => setTrainingSplit(split.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  trainingSplit === split.value
                    ? "bg-secondary/10 border-secondary"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
                disabled={isLoading}
              >
                <p className="font-semibold text-foreground text-sm mb-0.5">{split.label}</p>
                <p className="text-xs text-muted-foreground">{split.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-foreground mb-2">
            Frequência Semanal * ({weeklyFrequency}x por semana)
          </label>
          <input
            id="frequency"
            type="range"
            min="1"
            max="7"
            value={weeklyFrequency}
            onChange={(e) => setWeeklyFrequency(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={isLoading}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1x</span>
            <span>7x</span>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <DateField
            label="Data de Início"
            name="startDate"
            value={startDate}
            onChange={setStartDate}
            required
            disabled={isLoading}
          />
          <DateField
            label="Data de Término"
            name="endDate"
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
            required
            disabled={isLoading}
          />
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Metas (Opcional)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddGoal();
                }
              }}
              placeholder="Ex: Aumentar carga em 10%"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleAddGoal}
              className="px-4 py-2 bg-primary/10 border border-primary rounded-lg text-primary hover:bg-primary/20 transition-colors"
              disabled={isLoading}
            >
              Adicionar
            </button>
          </div>
          {goals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {goals.map((goal, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm flex items-center gap-2"
                >
                  🎯 {goal}
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(index)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
            Observações
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre esta ficha..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Error */}
        {createMutation.isError && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
            <p className="text-sm text-destructive">
              {(createMutation.error as Error)?.message || "Erro ao criar ficha"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Button fullWidth variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            fullWidth
            type="submit"
            isLoading={isLoading}
            disabled={!name || !startDate || !endDate}
          >
            {isLoading ? "Criando..." : "Criar Ficha"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
