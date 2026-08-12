"use client";

import type { Food } from "@elevapro/shared";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";

interface AddFoodQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  food: Food | null;
  suggestedQuantity?: number;
}

const MACROS = [
  { label: "Calorias", key: "calories", tone: "text-foreground", suffix: "" },
  { label: "Prot", key: "protein", tone: "text-success", suffix: "g" },
  { label: "Carb", key: "carbs", tone: "text-secondary", suffix: "g" },
  { label: "Gord", key: "fat", tone: "text-warning", suffix: "g" },
] as const;

export function AddFoodQuantityModal({
  isOpen,
  onClose,
  onConfirm,
  food,
  suggestedQuantity,
}: AddFoodQuantityModalProps) {
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (isOpen && suggestedQuantity) {
      setQuantity(Math.round(suggestedQuantity).toString());
    } else if (isOpen) {
      setQuantity("100");
    }
  }, [isOpen, suggestedQuantity]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseFloat(quantity);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onConfirm(parsed);
      setQuantity("");
    }
  };

  // Sem alimento nao ha o que quantificar — o corpo depende dele inteiro.
  if (!food) return null;

  const ratio = parseFloat(quantity || "0") / food.serving_size;

  return (
    <Dialog open={isOpen} onClose={onClose} title="Confirmar Quantidade">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-background/50 rounded-lg p-4 border border-overlay-08">
          <h3 className="font-semibold text-foreground">{food.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {food.calories} kcal por {food.serving_size}
            {food.serving_unit}
          </p>
        </div>

        <label className="block space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">
            Quantidade ({food.serving_unit})
          </span>
          <div className="relative">
            <input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="0"
              step="any"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {food.serving_unit}
            </span>
          </div>
        </label>

        {parseFloat(quantity || "0") > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Valores nutricionais:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {MACROS.map((macro) => (
                <div key={macro.key}>
                  <p className="text-xs text-muted-foreground">{macro.label}</p>
                  <p className={`text-sm font-bold ${macro.tone}`}>
                    {Math.round((food[macro.key] ?? 0) * ratio)}
                    {macro.suffix}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
