"use client";

import { supabase } from "@elevapro/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

export default function EditFoodPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "protein",
    serving_size: 100,
    serving_unit: "g",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    loadFood();
  }, [loadFood]);

  async function loadFood() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("foods").select("*").eq("id", id).single();

      if (error) throw error;

      setFormData({
        name: data.name,
        category: data.category,
        serving_size: data.serving_size,
        serving_unit: data.serving_unit,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      });
    } catch (error) {
      console.error("Error loading food:", error);
      alert("Falha ao carregar alimento");
      router.push("/admin/content/foods");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase.from("foods").update(formData).eq("id", id);

      if (error) throw error;

      alert("Alimento atualizado com sucesso");
      router.push("/admin/content/foods");
    } catch (error) {
      console.error("Error updating food:", error);
      alert("Falha ao atualizar alimento");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja deletar este alimento? Esta ação não pode ser desfeita."))
      return;

    try {
      const { error } = await supabase.from("foods").delete().eq("id", id);

      if (error) throw error;

      router.push("/admin/content/foods");
    } catch (error) {
      console.error("Error deleting food:", error);
      alert("Falha ao deletar alimento");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando alimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2"
          >
            ← Voltar para alimentos
          </button>
          <h1 className="text-3xl font-bold text-foreground">Editar Alimento</h1>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 font-medium"
        >
          Deletar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
                Categoria
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="protein">Proteína</option>
                <option value="carbohydrate">Carboidrato</option>
                <option value="fat">Gordura</option>
                <option value="vegetable">Vegetal</option>
                <option value="fruit">Fruta</option>
                <option value="beverage">Bebida</option>
                <option value="supplement">Suplemento</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="serving_size"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Porção Padrão (g/ml)
                </label>
                <input
                  id="serving_size"
                  type="number"
                  required
                  value={formData.serving_size}
                  onChange={(e) =>
                    setFormData({ ...formData, serving_size: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="serving_unit"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Unidade da Porção
                </label>
                <select
                  id="serving_unit"
                  value={formData.serving_unit}
                  onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="un">un</option>
                  <option value="col">col</option>
                  <option value="xic">xic</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-xl font-bold text-foreground pt-4">
              Informação Nutricional (por 100g)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="calories"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Calorias (kcal)
                </label>
                <input
                  id="calories"
                  type="number"
                  required
                  value={formData.calories}
                  onChange={(e) =>
                    setFormData({ ...formData, calories: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="protein" className="block text-sm font-medium text-foreground mb-1">
                  Proteínas (g)
                </label>
                <input
                  id="protein"
                  type="number"
                  required
                  value={formData.protein}
                  onChange={(e) =>
                    setFormData({ ...formData, protein: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="carbs" className="block text-sm font-medium text-foreground mb-1">
                  Carboidratos (g)
                </label>
                <input
                  id="carbs"
                  type="number"
                  required
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="fat" className="block text-sm font-medium text-foreground mb-1">
                  Gorduras (g)
                </label>
                <input
                  id="fat"
                  type="number"
                  required
                  value={formData.fat}
                  onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
