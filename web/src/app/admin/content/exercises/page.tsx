"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

// Espelha as colunas reais de `exercises`. A interface antiga declarava
// "category", "equipment", "difficulty" e "status", que a tabela nunca teve:
// a coluna Categoria da listagem vinha vazia, o filtro de status não filtrava
// nada e os botões Aprovar/Rejeitar nunca apareciam (`status` era sempre
// undefined). O estado real de curadoria é `is_verified`.
interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  is_verified: boolean;
  created_by: string | null;
}

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");

  const loadExercises = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, is_verified, created_by")
        .order("name");

      if (error) throw error;

      setExercises(data || []);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  async function toggleVerified(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from("exercises")
        .update({ is_verified: !current })
        .eq("id", id);

      if (error) throw error;

      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, is_verified: !current } : ex)),
      );
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Failed to update verification");
    }
  }

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerified = verifiedFilter === "all" || String(ex.is_verified) === verifiedFilter;

    return matchesSearch && matchesVerified;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando exercícios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            Exercícios
          </h1>
          <p className="text-muted-foreground">Gerencie e modere exercícios</p>
        </div>
        <Button onClick={() => router.push("/admin/content/exercises/create")}>
          + Novo Exercício
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search-exercises" className="sr-only">
              Buscar exercícios
            </label>
            <input
              id="search-exercises"
              type="text"
              placeholder="Buscar exercícios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="verified-filter" className="sr-only">
              Filtrar por verificação
            </label>
            <select
              id="verified-filter"
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos</option>
              <option value="true">Verificados</option>
              <option value="false">Não verificados</option>
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
                Grupo Muscular
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Verificado
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredExercises.map((ex) => (
              <tr key={ex.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{ex.name}</span>
                    {ex.is_verified && (
                      <span className="text-blue-400" title="Verificado">
                        ✓
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{ex.muscle_group}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${
                      ex.is_verified
                        ? "bg-green-500/20 text-green-400 border-green-500/50"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                    }`}
                  >
                    {ex.is_verified ? "Verificado" : "Não verificado"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleVerified(ex.id, ex.is_verified)}
                      className={`p-1 rounded ${ex.is_verified ? "text-blue-400" : "text-muted-foreground hover:text-blue-400"}`}
                      title="Alternar Verificado"
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/content/exercises/${ex.id}`)}
                      className="text-primary hover:text-primary/80 font-medium text-sm ml-2"
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredExercises.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum exercício encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
