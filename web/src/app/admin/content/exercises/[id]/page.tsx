"use client";

import { supabase } from "@elevapro/supabase";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { ExerciseClassificationFields } from "@/shared/components/ui/ExerciseClassificationFields";

export default function EditExercisePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // O formulário editava "equipment", "difficulty" e "instructions", que nunca
  // existiram na tabela: o UPDATE mandava as três e o PostgREST recusava a
  // escrita inteira com 42703 — salvar nunca funcionou. `category` e `venue`
  // existem desde a 0042 e são editáveis.
  const [formData, setFormData] = useState({
    name: "",
    muscle_group: "",
    venue: "academia",
    category: "forca",
    description: "",
    video_url: "",
  });

  // Sem `useCallback`, a função nascia nova a cada render e o efeito que a
  // tem como dependência disparava em todo render — uma consulta por render.
  const loadExercise = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("exercises")
        .select("name, muscle_group, venue, category, description, video_url")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        muscle_group: data.muscle_group ?? "",
        venue: data.venue,
        category: data.category,
        description: data.description ?? "",
        video_url: data.video_url ?? "",
      });
    } catch (error) {
      console.error("Error loading exercise:", error);
      alert("Falha ao carregar exercício");
      router.push("/admin/content/exercises");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

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
            type="button"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2"
          >
            ← Voltar para exercícios
          </button>
          <h1 className="text-3xl font-bold text-foreground">Editar Exercício</h1>
        </div>
        <button
          type="button"
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

          <ExerciseClassificationFields
            values={formData}
            onChange={(campo, valor) => setFormData({ ...formData, [campo]: valor })}
          />

          <div className="grid grid-cols-2 gap-4">
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
