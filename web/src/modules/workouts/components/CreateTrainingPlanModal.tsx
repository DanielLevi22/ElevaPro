"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { DateField } from "@/shared/components/ui/DateField";
import { Dialog } from "@/shared/components/ui/Dialog";
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

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Nova Fase" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <DateField label="Início" value={startDate} onChange={setStartDate} required />
          <DateField
            label="Fim"
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Descrição</label>
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
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Criar Fase
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
