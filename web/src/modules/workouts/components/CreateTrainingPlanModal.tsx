"use client";

import { useState } from "react";
import { useCreateTrainingPlan } from "@/shared/hooks/useTrainingPlanMutations";

type TrainingSplit =
  | "full_body"
  | "upper_lower"
  | "abc"
  | "abcd"
  | "abcde"
  | "push_pull_legs"
  | "custom";

const SPLITS: { value: TrainingSplit; label: string; desc: string }[] = [
  { value: "full_body", label: "Full Body", desc: "1 treino completo" },
  { value: "upper_lower", label: "Superior / Inferior", desc: "2 fichas" },
  { value: "abc", label: "ABC", desc: "3 fichas" },
  { value: "abcd", label: "ABCD", desc: "4 fichas" },
  { value: "abcde", label: "ABCDE", desc: "5 fichas" },
  { value: "push_pull_legs", label: "Push / Pull / Legs", desc: "3 fichas" },
  { value: "custom", label: "Personalizado", desc: "livre" },
];

const TYPES = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "strength", label: "Força" },
  { value: "adaptation", label: "Adaptação" },
] as const;

interface Props {
  periodizationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTrainingPlanModal({ periodizationId, isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [split, setSplit] = useState<TrainingSplit>("abc");
  const [frequency, setFrequency] = useState("3");
  const [type, setType] = useState<"hypertrophy" | "strength" | "adaptation">("hypertrophy");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateTrainingPlan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    await createMutation.mutateAsync({
      periodization_id: periodizationId,
      name,
      start_date: startDate,
      end_date: endDate,
    });
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setSplit("abc");
    setFrequency("3");
    setType("hypertrophy");
    setStartDate("");
    setEndDate("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-overlay-10 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-overlay-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Nova Fase</h2>
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
              placeholder="Ex: Ficha A, Semana 1-4"
              required
              className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Split */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Divisão de Treino <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPLITS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSplit(s.value)}
                  className={`py-2 px-3 rounded-lg text-left transition-all ${
                    split === s.value
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-background border border-overlay-10 text-muted-foreground hover:bg-overlay-05"
                  }`}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs opacity-60">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo + Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Freq. semanal
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-overlay-10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
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

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Foco desta fase..."
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
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              Criar Fase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
