"use client";

import { useState } from "react";
import { CustomTimePicker } from "@/shared/components/CustomTimePicker";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

interface EditMealTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: string) => void;
  currentTime?: string;
  mealName: string;
}

export function EditMealTimeModal({
  isOpen,
  onClose,
  onSave,
  currentTime,
  mealName,
}: EditMealTimeModalProps) {
  const [time, setTime] = useState(currentTime || "08:00");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(time);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Editar Horário" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-background/50 rounded-lg p-4 border border-overlay-08">
          <p className="text-sm font-medium text-foreground">{mealName}</p>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">Horário</span>
          <CustomTimePicker value={time} onChange={setTime} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Dialog>
  );
}
