/** Monta conteúdo genérico para importação, sem IDs pessoais ou porções. @example buildMealCatalogImport(candidates, completed) */
export function buildMealCatalogImport(candidates, completed) {
  const ids = new Set(candidates.map((candidate) => candidate.id));
  if (ids.size !== candidates.length)
    throw new Error("Catálogo inválido: esperado IDs de candidatos únicos.");
  for (const entry of completed) validateImage(entry, ids);
  const images = new Map(completed.map((entry) => [entry.candidateId, entry]));
  return {
    dishes: candidates.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      template: candidate.template,
      status: "draft",
      ingredients: candidate.ingredients,
      image_id: images.get(candidate.id)?.asset.id ?? null,
    })),
    assets: completed.map((entry) => ({
      id: entry.asset.id,
      version: entry.asset.version,
      storage_path: entry.asset.path,
      delivery_base_url: entry.url.slice(0, -entry.asset.path.length).replace(/\/$/, ""),
      bytes: entry.asset.bytes,
      content_type: entry.asset.contentType,
      sha256: entry.asset.sha256,
      verified_at: entry.verifiedAt,
    })),
  };
}

function validateImage(entry, ids) {
  if (!ids.has(entry.candidateId))
    throw new Error(`Imagem sem candidato: ${entry.candidateId}; esperado ID do catálogo.`);
  if (
    entry.imageStatus !== "completed" ||
    !entry.asset ||
    !Number.isFinite(Date.parse(entry.verifiedAt))
  )
    throw new Error(
      `Imagem não verificada: ${entry.candidateId}; esperado conclusão e data de verificação.`,
    );
  const endpoint = new URL(entry.url);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !entry.url.endsWith(`/${entry.asset.path}`) ||
    entry.asset.id !== `photo-${entry.candidateId}`
  )
    throw new Error(
      `Origem inválida: ${entry.candidateId}; esperado HTTPS sem credenciais e caminho do asset.`,
    );
}
