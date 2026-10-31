import { createClient } from "@supabase/supabase-js";

/** A CLI escreve apenas oficiais sem vídeo, nunca exercícios de especialista. @example createExerciseVideoCatalog(url, key) */
export function createExerciseVideoCatalog(url, key) {
  if (!url || !key)
    throw new Error(
      "Catálogo indisponível: esperado SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente restrito da CLI.",
    );
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    listOfficial: async () => {
      const { data: exercises, error } = await client
        .from("exercises")
        .select("id,name,video_url")
        .eq("is_verified", true)
        .is("created_by", null)
        .order("name")
        .limit(1000);
      if (error)
        throw new Error(
          `Consulta do catálogo recusada: ${error.code}; esperado acesso operacional autorizado.`,
        );
      return exercises;
    },
    publishIfEmpty: async (id, videoUrl) => {
      const { data: updated, error } = await client
        .from("exercises")
        .update({ video_url: videoUrl })
        .eq("id", id)
        .eq("is_verified", true)
        .is("created_by", null)
        .is("video_url", null)
        .select("id");
      if (error)
        throw new Error(
          `Publicação do catálogo recusada: ${error.code}; esperado oficial sem vídeo.`,
        );
      return updated.length === 1;
    },
  };
}
