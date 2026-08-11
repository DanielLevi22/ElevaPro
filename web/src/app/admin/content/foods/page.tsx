"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_unit: string;
  serving_size: number;
  status: "pending" | "approved" | "rejected";
  is_verified: boolean;
  created_by: string | null;
}

export default function FoodsPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadFoods = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.from("foods").select("*").order("name");

      if (error) throw error;

      setFoods(data || []);
    } catch (error) {
      console.error("Error loading foods:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  async function updateStatus(id: string, newStatus: "approved" | "rejected") {
    try {
      const { error } = await supabase.from("foods").update({ status: newStatus }).eq("id", id);

      if (error) throw error;

      setFoods((prev) =>
        prev.map((food) => (food.id === id ? { ...food, status: newStatus } : food)),
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  }

  async function toggleVerified(id: string, current: boolean) {
    try {
      const { error } = await supabase.from("foods").update({ is_verified: !current }).eq("id", id);

      if (error) throw error;

      setFoods((prev) =>
        prev.map((food) => (food.id === id ? { ...food, is_verified: !current } : food)),
      );
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Failed to update verification");
    }
  }

  const filteredFoods = foods.filter((food) => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || food.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || food.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(foods.map((f) => f.category)))
    .filter(Boolean)
    .sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando alimentos...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            Alimentos
          </h1>
          <p className="text-muted-foreground">Gerencie e modere alimentos</p>
        </div>
        <Button onClick={() => router.push("/admin/content/foods/create")}>+ Novo Alimento</Button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search-foods" className="sr-only">
              Buscar alimentos
            </label>
            <input
              id="search-foods"
              type="text"
              placeholder="Buscar alimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>

          <div>
            <label htmlFor="category-filter" className="sr-only">
              Filtrar por categoria
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nome</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Categoria
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Macros (por 100g)
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredFoods.map((food) => (
              <tr key={food.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{food.name}</span>
                    {food.is_verified && (
                      <span className="text-blue-400" title="Verificado">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {food.serving_size}
                    {food.serving_unit} serving
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{food.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-orange-400">{Math.round(food.calories)}kcal</span>
                    <span className="text-blue-400">P:{food.protein}g</span>
                    <span className="text-green-400">C:{food.carbs}g</span>
                    <span className="text-yellow-400">G:{food.fat}g</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${
                      food.status === "approved"
                        ? "bg-green-500/20 text-green-400 border-green-500/50"
                        : food.status === "rejected"
                          ? "bg-red-500/20 text-red-400 border-red-500/50"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                    }`}
                  >
                    {food.status || "approved"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {food.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(food.id, "approved")}
                          className="p-1 text-green-400 hover:bg-green-500/10 rounded"
                          title="Aprovar"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(food.id, "rejected")}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                          title="Rejeitar"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleVerified(food.id, food.is_verified)}
                      className={`p-1 rounded ${food.is_verified ? "text-blue-400" : "text-muted-foreground hover:text-blue-400"}`}
                      title="Alternar Verificado"
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/content/foods/${food.id}`)}
                      className="text-primary hover:text-primary/80 font-medium text-sm ml-2"
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredFoods.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum alimento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
