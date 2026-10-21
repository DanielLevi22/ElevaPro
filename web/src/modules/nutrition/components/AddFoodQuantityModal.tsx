"use client";

import type { Food } from "@elevapro/shared";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { macrosForQuantity, quantityToClose } from "../utils/macroTotals";
import { DayBalance, type DaySnapshot } from "./DayBalance";

interface AddFoodQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  food: Food | null;
  suggestedQuantity?: number;
  /** Saldo do dia: sem ele o modal some com o que falta da tela. */
  daySnapshot?: DaySnapshot;
}

const MACROS = [
  { label: "Calorias", key: "calories", tone: "text-foreground", suffix: "" },
  { label: "Prot", key: "protein", tone: "text-success", suffix: "g" },
  { label: "Carb", key: "carbs", tone: "text-secondary", suffix: "g" },
  { label: "Gord", key: "fat", tone: "text-warning", suffix: "g" },
] as const;

const CLOSABLE_MACROS = [
  { key: "protein", label: "proteína" },
  { key: "carbs", label: "carbo" },
  { key: "fat", label: "gordura" },
] as const;

interface CloseGapShortcutsProps {
  food: Food;
  daySnapshot: DaySnapshot;
  onPick: (quantity: number) => void;
}

// Atalho para a pergunta que o especialista faz no modal: "quanto disto fecha o que falta?".
function CloseGapShortcuts({ food, daySnapshot, onPick }: CloseGapShortcutsProps) {
  const shortcuts = CLOSABLE_MACROS.flatMap(({ key, label }) => {
    const remaining = daySnapshot.targets[key] - daySnapshot.consumed[key];
    const quantity = quantityToClose(food, key, remaining);
    return quantity ? [{ key, label, quantity }] : [];
  });
  if (shortcuts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Completar o dia:</span>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.key}
          type="button"
          onClick={() => onPick(shortcut.quantity)}
          className="text-xs font-semibold px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          {shortcut.label} · {shortcut.quantity}
          {food.serving_unit}
        </button>
      ))}
    </div>
  );
}

export function AddFoodQuantityModal({
  isOpen,
  onClose,
  onConfirm,
  food,
  suggestedQuantity,
  daySnapshot,
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

  const parsedQuantity = parseFloat(quantity || "0") || 0;
  const ratio = parsedQuantity / food.serving_size;

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

        {parsedQuantity > 0 && (
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

        {daySnapshot && (
          <>
            <CloseGapShortcuts
              food={food}
              daySnapshot={daySnapshot}
              onPick={(picked) => setQuantity(picked.toString())}
            />
            <DayBalance {...daySnapshot} preview={macrosForQuantity(food, parsedQuantity)} />
          </>
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
