"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

// Espelha as colunas reais de `foods`. A interface antiga declarava "status" e
// "is_verified", que a tabela nunca teve: o selo, o filtro e os botões de
// aprovar/rejeitar/verificar operavam sobre campos inexistentes e toda escrita
// era recusada com 42703. A distinção que a tabela realmente faz é `is_custom`
// (criado por usuário) contra catálogo, com a procedência em `source`.
interface Food {
  id: string;
  name: string;
  category: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_unit: string | null;
  serving_size: number | null;
  is_custom: boolean;
  source: string | null;
  created_by: string | null;
}

export default function FoodsPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadFoods = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("foods")
        .select(
          "id, name, category, calories, protein, carbs, fat, serving_unit, serving_size, is_custom, source, created_by",
        )
        .order("name");

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

  const filteredFoods = foods.filter((food) => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = originFilter === "all" || String(food.is_custom) === originFilter;
    const matchesCategory = categoryFilter === "all" || food.category === categoryFilter;

    return matchesSearch && matchesOrigin && matchesCategory;
  });

  const categories = Array.from(new Set(foods.map((f) => f.category ?? "")))
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
            <label htmlFor="origin-filter" className="sr-only">
              Filtrar por origem
            </label>
            <select
              id="origin-filter"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas as Origens</option>
              <option value="false">Catálogo</option>
              <option value="true">Criado por usuário</option>
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
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {food.serving_size}
                    {food.serving_unit} serving
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{food.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-orange-400">{Math.round(food.calories ?? 0)}kcal</span>
                    <span className="text-blue-400">P:{food.protein ?? 0}g</span>
                    <span className="text-green-400">C:{food.carbs ?? 0}g</span>
                    <span className="text-yellow-400">G:{food.fat ?? 0}g</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${
                      food.is_custom
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                        : "bg-green-500/20 text-green-400 border-green-500/50"
                    }`}
                    title={food.source ?? undefined}
                  >
                    {food.is_custom ? "Criado por usuário" : "Catálogo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
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
