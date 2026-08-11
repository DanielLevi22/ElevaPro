"use client";

import { useState } from "react";
import { CustomTimePicker } from "@/shared/components/CustomTimePicker";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, time: string) => void;
}

const SUGGESTIONS = [
  { name: "Café da Manhã", time: "08:00" },
  { name: "Lanche da Manhã", time: "10:30" },
  { name: "Almoço", time: "13:00" },
  { name: "Lanche da Tarde", time: "16:00" },
  { name: "Jantar", time: "19:30" },
  { name: "Ceia", time: "22:00" },
  { name: "Pré-Treino", time: "18:00" },
  { name: "Pós-Treino", time: "19:30" },
];

export function AddMealModal({ isOpen, onClose, onSave }: AddMealModalProps) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name, time);
    setName("");
    setTime("08:00");
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Nova Refeição">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">Sugestões</span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => {
                  setName(suggestion.name);
                  setTime(suggestion.time);
                }}
                className="px-3 py-1.5 rounded-lg bg-surface border border-overlay-08 text-[10px] font-bold text-muted-foreground hover:bg-overlay-05 transition-colors uppercase tracking-widest"
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">Nome da Refeição</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            placeholder="Ex: Café da Manhã"
            required
          />
        </label>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">Horário</span>
          <CustomTimePicker value={time} onChange={setTime} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Adicionar</Button>
        </div>
      </form>
    </Dialog>
  );
}
