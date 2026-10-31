import { createHash } from "node:crypto";

/**
 * Publica um lote validado inteiro antes do primeiro envio, preservando versões existentes.
 * @example publishExerciseVideos(bundle, files, catalog, store, endpoint)
 */
export async function publishExerciseVideos(bundle, files, catalog, store, endpoint) {
  const base = new URL(`${endpoint.replace(/\/$/, "")}/`);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
    throw new Error(`Destino inválido: ${base.origin}; esperado endpoint HTTPS sem credenciais.`);
  validateRelease(bundle);
  const official = await catalog.listOfficial();
  const pending = prepareBatch(bundle.clips, files, official, base);
  for (const { clip, exercise, url } of pending) {
    await store.write(clip.poster, files.get(clip.poster.path));
    await store.write(clip.video, files.get(clip.video.path));
    if (exercise.video_url === url) continue;
    if (!(await catalog.publishIfEmpty(exercise.id, url)))
      throw new Error(
        `Publicação concorrente: ${clip.name}; esperado exercício ainda sem vídeo. Reexecute para conferir.`,
      );
  }
  return pending.map(({ clip, url }) => ({ name: clip.name, url }));
}

function validateRelease(bundle) {
  if (bundle?.version !== 1 || !Array.isArray(bundle.clips) || bundle.clips.length > 500)
    throw new Error("Lote inválido: esperado versão 1 com até 500 clipes.");
  const release = bundle.release;
  for (const field of ["imageReleaseRef", "privacyReviewRef", "quotaCheckedAt"]) {
    if (typeof release?.[field] !== "string" || !release[field].trim())
      throw new Error(
        `Publicação bloqueada: ${field}; esperado referência preenchida após conferência humana.`,
      );
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(release.quotaCheckedAt) ||
    !Number.isFinite(Date.parse(release.quotaCheckedAt)) ||
    Date.parse(release.quotaCheckedAt) > Date.now()
  )
    throw new Error(
      `Cota inválida: ${release.quotaCheckedAt}; esperado data passada ou atual YYYY-MM-DD.`,
    );
}

function prepareBatch(clips, files, official, base) {
  const names = new Set();
  const paths = new Set();
  return clips.map((clip) => {
    const matches = official.filter((exercise) => exercise.name === clip.name);
    if (matches.length !== 1 || names.has(clip.name))
      throw new Error(
        `Exercício inválido: ${clip.name}; esperado nome oficial único, sem repetição no lote.`,
      );
    if (clip.technicalReviewed !== true)
      throw new Error(
        `Revisão pendente: ${clip.name}; esperado execução e corte aprovados por especialista.`,
      );
    names.add(clip.name);
    validateFile(clip.video, files, paths, "mp4", 999_999);
    validateFile(clip.poster, files, paths, "jpg", 300_000);
    if (clip.poster.path !== clip.video.path.replace(/\.mp4$/, ".jpg"))
      throw new Error(
        `Capa inválida: ${clip.poster.path}; esperado mesmo caminho do MP4 com extensão .jpg.`,
      );
    const url = new URL(clip.video.path, base).href;
    if (matches[0].video_url && matches[0].video_url !== url)
      throw new Error(
        `Versão publicada: ${clip.name}; esperado vídeo vazio ou mesmo endereço, sem sobrescrever.`,
      );
    return { clip, exercise: matches[0], url };
  });
}

function validateFile(asset, files, paths, extension, maximum) {
  const path = asset?.path;
  const expected = extension === "mp4" ? "video/mp4" : "image/jpeg";
  if (
    typeof path !== "string" ||
    !/^exercises\/[a-z0-9-]+\/v[1-9]\d*\.(mp4|jpg)$/.test(path) ||
    !path.endsWith(`.${extension}`) ||
    paths.has(path) ||
    asset.contentType !== expected
  )
    throw new Error(
      `Arquivo inválido: ${path}; esperado exercises/<slug>/vN.${extension} único (${expected}).`,
    );
  const bytes = files.get(path);
  const hash = bytes && createHash("sha256").update(bytes).digest("hex");
  if (
    !bytes ||
    bytes.length !== asset.bytes ||
    bytes.length < 1 ||
    bytes.length > maximum ||
    hash !== asset.sha256
  )
    throw new Error(
      `Integridade inválida: ${path}; esperado SHA-256 e tamanho de 1 a ${maximum} bytes.`,
    );
  paths.add(path);
}
