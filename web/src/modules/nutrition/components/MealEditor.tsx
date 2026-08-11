"use client";

import type { DietMeal, DietMealItem, Food } from "@elevapro/shared";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { Dialog } from "@/shared/components/ui/Dialog";
import {
  useAddFoodToMeal,
  useAddMeal,
  useDeleteMeal,
  useDietMeals,
  useRemoveMealItem,
  useUpdateMeal,
  useUpdateMealItem,
} from "@/shared/hooks/useNutrition";
import { AddFoodQuantityModal } from "./AddFoodQuantityModal";
import { AddMealModal } from "./AddMealModal";
import { EditFoodModal } from "./EditFoodModal";
import { EditMealTimeModal } from "./EditMealTimeModal";
import { FoodSelector } from "./FoodSelector";
import { MealCard } from "./MealCard";

interface MealEditorProps {
  dietPlanId: string;
  dayOfWeek: number; // 0-6 for cyclic, -1 for unique
}

export function MealEditor({ dietPlanId, dayOfWeek }: MealEditorProps) {
  const { data: allMeals = [], isLoading } = useDietMeals(dietPlanId);
  const addMealMutation = useAddMeal();
  const addFoodMutation = useAddFoodToMeal();
  const updateMealMutation = useUpdateMeal();
  const updateItemMutation = useUpdateMealItem();
  const removeFoodMutation = useRemoveMealItem();
  const deleteMealMutation = useDeleteMeal();

  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditTimeModalOpen, setIsEditTimeModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [isConfirmDeleteMealOpen, setIsConfirmDeleteMealOpen] = useState(false);

  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<DietMealItem | null>(null);
  const [editingMeal, setEditingMeal] = useState<DietMeal | null>(null);
  const [pendingFood, setPendingFood] = useState<{
    food: Food;
    calculatedQuantity?: number;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [mealToDeleteId, setMealToDeleteId] = useState<string | null>(null);

  const meals = allMeals.filter((m) => m.day_of_week === dayOfWeek);

  const handleDeleteMeal = async (id: string) => {
    try {
      await deleteMealMutation.mutateAsync(id);
      toast.success("Refeição removida com sucesso!");
      setIsConfirmDeleteMealOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover refeição.");
    }
  };

  const handleConfirmQuantity = async (quantity: number, food?: Food) => {
    const foodToAdd = food || pendingFood?.food;
    if (!selectedMealId || !foodToAdd) return;

    try {
      setIsFoodModalOpen(false);
      setIsQuantityModalOpen(false);
      setPendingFood(null);

      await addFoodMutation.mutateAsync({
        diet_meal_id: selectedMealId,
        food_id: foodToAdd.id,
        quantity,
        unit: foodToAdd.serving_unit,
        order_index: 999,
      });
      toast.success(`${foodToAdd.name} adicionado!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar alimento.");
    }
  };

  if (isLoading && allMeals.length === 0)
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando refeições...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Refeições do Dia
        </h3>
      </div>

      <div className="space-y-4">
        {meals.length === 0 ? (
          <div className="bg-surface border border-white/10 rounded-2xl p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Nenhuma refeição neste dia</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione refeições para estruturar o dia alimentar. Depois de criar a estrutura,
                  você popula cada refeição com alimentos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  n: 1,
                  icon: "🍽️",
                  label: "Criar Refeição",
                  desc: "Nome e horário (ex: Café da manhã, 07:00)",
                },
                {
                  n: 2,
                  icon: "🔍",
                  label: "Buscar Alimentos",
                  desc: "Pesquise e adicione itens com a calculadora reversa",
                },
                {
                  n: 3,
                  icon: "📋",
                  label: "Repetir por Dia",
                  desc: "Copie a estrutura para os outros dias da semana",
                },
              ].map((step) => (
                <div key={step.n} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <span className="text-2xl">{step.icon}</span>
                  <p className="text-xs font-bold text-foreground mt-2">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsAddMealModalOpen(true)}
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              + Adicionar primeira refeição
            </button>
          </div>
        ) : (
          <>
            {meals
              .sort((a, b) => a.meal_order - b.meal_order)
              .map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onAddFood={(id) => {
                    setSelectedMealId(id);
                    setIsFoodModalOpen(true);
                  }}
                  onEditTime={(m) => {
                    setEditingMeal(m);
                    setIsEditTimeModalOpen(true);
                  }}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setIsEditModalOpen(true);
                  }}
                  onRemoveItem={(id) => {
                    setItemToDelete(id);
                    setIsDeleteConfirmOpen(true);
                  }}
                  onDeleteMeal={() => {
                    setMealToDeleteId(meal.id);
                    setIsConfirmDeleteMealOpen(true);
                  }}
                />
              ))}

            <button
              onClick={() => setIsAddMealModalOpen(true)}
              className="w-full py-8 border-2 border-dashed border-white/5 rounded-3xl text-zinc-500 hover:text-zinc-400 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-3 group mt-4"
            >
              <div className="p-3 rounded-full bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span className="font-black text-[10px] uppercase tracking-[0.3em]">
                Provisionar Nova Refeição
              </span>
            </button>
          </>
        )}
      </div>

      <Dialog
        open={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        title="Seleção de Alimentos"
        maxWidth="lg"
        scrollable
      >
        <FoodSelector
          onSelect={(food, q) => {
            if (q) handleConfirmQuantity(q, food);
            else {
              setPendingFood({ food, calculatedQuantity: q });
              setIsQuantityModalOpen(true);
            }
          }}
        />
      </Dialog>

      <EditFoodModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(id, q) => {
          updateItemMutation.mutate({ id, quantity: q });
        }}
        item={editingItem}
      />

      <EditMealTimeModal
        isOpen={isEditTimeModalOpen}
        onClose={() => {
          setIsEditTimeModalOpen(false);
          setEditingMeal(null);
        }}
        onSave={(time) =>
          editingMeal && updateMealMutation.mutate({ id: editingMeal.id, meal_time: time })
        }
        currentTime={editingMeal?.meal_time || undefined}
        mealName={editingMeal?.name || ""}
      />

      <AddFoodQuantityModal
        isOpen={isQuantityModalOpen}
        onClose={() => {
          setIsQuantityModalOpen(false);
          setPendingFood(null);
        }}
        onConfirm={handleConfirmQuantity}
        food={pendingFood?.food || null}
        suggestedQuantity={pendingFood?.calculatedQuantity}
      />

      <AddMealModal
        isOpen={isAddMealModalOpen}
        onClose={() => setIsAddMealModalOpen(false)}
        onSave={async (name, time) => {
          try {
            await addMealMutation.mutateAsync({
              diet_plan_id: dietPlanId,
              day_of_week: dayOfWeek,
              name,
              meal_time: time,
              meal_type: "custom" as any,
              meal_order: meals.length + 1,
            });
            setIsAddMealModalOpen(false);
          } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar refeição.");
          }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (itemToDelete) {
            removeFoodMutation.mutate(itemToDelete, {
              onSuccess: () => toast.success("Alimento removido!"),
              onError: () => toast.error("Erro ao remover alimento."),
            });
          }
          setIsDeleteConfirmOpen(false);
        }}
        title="Remover Alimento?"
        description="Esta ação removerá permanentemente o alimento desta refeição."
        variant="danger"
      />

      <ConfirmModal
        isOpen={isConfirmDeleteMealOpen}
        onClose={() => setIsConfirmDeleteMealOpen(false)}
        onConfirm={() => mealToDeleteId && handleDeleteMeal(mealToDeleteId)}
        title="Excluir Refeição"
        description="Tem certeza que deseja remover esta refeição e todos os alimentos nela? Esta ação não pode ser desfeita."
        confirmLabel="Excluir Refeição"
        variant="danger"
      />
    </div>
  );
}

function _CustomMealModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, time: string) => void;
}) {
  return <AddMealModal isOpen={isOpen} onClose={onClose} onSave={onSave} />;
}
