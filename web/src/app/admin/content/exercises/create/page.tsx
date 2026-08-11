"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";

export default function CreateExercisePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "strength",
    muscle_group: "",
    equipment: "none",
    difficulty: "beginner",
    instructions: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("exercises").insert([
        {
          ...formData,
          status: "approved", // Admins create approved exercises by default
          is_verified: true,
        },
      ]);

      if (error) throw error;

      router.push("/admin/content/exercises");
    } catch (error) {
      console.error("Error creating exercise:", error);
      alert("Falha ao criar exercício");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2"
        >
          ← Voltar para exercícios
        </button>
        <h1 className="text-3xl font-bold text-foreground">Criar Exercício</h1>
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
              placeholder="ex: Supino Reto"
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
                placeholder="ex: Peito"
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
                placeholder="ex: Barra"
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
              placeholder="Instruções passo a passo..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isLoading ? "Criando..." : "Criar Exercício"}
          </Button>
        </div>
      </form>
    </div>
  );
}
