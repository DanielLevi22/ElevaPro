"use client";

import type { DietMealItem } from "@elevapro/shared";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

interface EditFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, quantity: number) => void;
  item: DietMealItem | null;
}

export function EditFoodModal({ isOpen, onClose, onSave, item }: EditFoodModalProps) {
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (item && isOpen) {
      setQuantity(item.quantity.toString());
    }
  }, [item, isOpen]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;

    const newQuantity = parseFloat(quantity);
    if (Number.isNaN(newQuantity) || newQuantity <= 0) return;

    onSave(item.id, newQuantity);
    onClose();
  };

  // Sem item nao ha o que editar — o modal depende dele para titulo e unidade.
  if (!item) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} title="Editar Quantidade">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-background/50 rounded-lg p-4 border border-overlay-08">
          <h3 className="font-semibold text-foreground">{item.food?.name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.food?.calories} kcal por {item.food?.serving_size}
            {item.food?.serving_unit}
          </p>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">
            Quantidade ({item.unit})
          </span>
          <div className="relative">
            <input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="0"
              step="any"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {item.unit}
            </span>
          </div>
        </label>

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
