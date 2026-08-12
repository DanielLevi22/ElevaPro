"use client";

import { supabase } from "@elevapro/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

export default function EditExercisePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "strength",
    muscle_group: "",
    equipment: "none",
    difficulty: "beginner",
    instructions: "",
  });

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  async function loadExercise() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("exercises").select("*").eq("id", id).single();

      if (error) throw error;

      setFormData({
        name: data.name,
        category: data.category,
        muscle_group: data.muscle_group,
        equipment: data.equipment,
        difficulty: data.difficulty,
        instructions: data.instructions || "",
      });
    } catch (error) {
      console.error("Error loading exercise:", error);
      alert("Falha ao carregar exercício");
      router.push("/admin/content/exercises");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase.from("exercises").update(formData).eq("id", id);

      if (error) throw error;

      alert("Exercício atualizado com sucesso");
      router.push("/admin/content/exercises");
    } catch (error) {
      console.error("Error updating exercise:", error);
      alert("Falha ao atualizar exercício");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja deletar este exercício? Esta ação não pode ser desfeita."))
      return;

    try {
      const { error } = await supabase.from("exercises").delete().eq("id", id);

      if (error) throw error;

      router.push("/admin/content/exercises");
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Falha ao deletar exercício");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando exercício...</p>
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
            ← Voltar para exercícios
          </button>
          <h1 className="text-3xl font-bold text-foreground">Editar Exercício</h1>
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
                <option value="strength">Força</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibilidade</option>
                <option value="plyometrics">Pliometria</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="difficulty"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Dificuldade
              </label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="muscle_group"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Grupo Muscular
              </label>
              <input
                id="muscle_group"
                type="text"
                required
                value={formData.muscle_group}
                onChange={(e) => setFormData({ ...formData, muscle_group: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="equipment" className="block text-sm font-medium text-foreground mb-1">
                Equipamento
              </label>
              <input
                id="equipment"
                type="text"
                required
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="instructions"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Instruções
            </label>
            <textarea
              id="instructions"
              rows={4}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
