"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";

export default function CreateExercisePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Só colunas que `exercises` tem. "category", "equipment", "difficulty",
  // "instructions" e "status" nunca existiram na tabela: o INSERT levava as
  // cinco e era recusado inteiro com 42703 — criar exercício nunca funcionou.
  const [formData, setFormData] = useState({
    name: "",
    muscle_group: "",
    description: "",
    video_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("exercises").insert([
        // Exercício criado pelo admin nasce verificado.
        { ...formData, is_verified: true },
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
          type="button"
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
              <label htmlFor="video_url" className="block text-sm font-medium text-foreground mb-1">
                Vídeo (URL)
              </label>
              <input
                id="video_url"
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Descrição
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Execução, cuidados, observações..."
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
