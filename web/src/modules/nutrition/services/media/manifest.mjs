import { createHash } from "node:crypto";

/** @typedef {import('@elevapro/shared').MealImageManifest} MealImageManifest */
/** @typedef {import('@elevapro/shared').MealImageAsset} MealImageAsset */

/** Valida um manifesto portátil sem aceitar configuração privada. @example validateManifest(json) */
/** @param {unknown} input @returns {MealImageManifest} */
export function validateManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Manifesto inválido: esperado objeto versão 1.");
  const manifest = /** @type {MealImageManifest} */ (input);
  if (manifest.version !== 1 || !Array.isArray(manifest.assets) || manifest.assets.length > 500)
    throw new Error("Manifesto inválido: esperado versão 1 com até 500 imagens.");
  const ids = new Set();
  const paths = new Set();
  for (const asset of manifest.assets) {
    validateAsset(asset);
    if (ids.has(asset.id) || paths.has(asset.path))
      throw new Error(`Imagem duplicada: ${asset.id}; esperado ID e caminho únicos.`);
    ids.add(asset.id);
    paths.add(asset.path);
  }
  return {
    version: 1,
    assets: manifest.assets.map(({ id, version, path, bytes, sha256, contentType }) => ({
      id,
      version,
      path,
      bytes,
      sha256,
      contentType,
    })),
  };
}

/** @param {MealImageAsset} asset */
function validateAsset(asset) {
  if (
    !asset ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(asset.id) ||
    !Number.isSafeInteger(asset.version) ||
    asset.version < 1
  )
    throw new Error("Imagem inválida: esperado ID próprio e versão inteira positiva.");
  if (
    typeof asset.path !== "string" ||
    !/^[a-z0-9][a-z0-9/._-]*\.(jpg|png|webp)$/.test(asset.path) ||
    asset.path.split("/").some((part) => part === ".." || part === "." || !part)
  )
    throw new Error(`Caminho inválido: ${asset.path}; esperado caminho relativo sem travessia.`);
  if (
    !Number.isSafeInteger(asset.bytes) ||
    asset.bytes < 1 ||
    asset.bytes > 3_000_000 ||
    !/^[a-f0-9]{64}$/.test(asset.sha256)
  )
    throw new Error(`Integridade inválida: ${asset.id}; esperado tamanho até 3 MB e SHA-256.`);
  if (!["image/jpeg", "image/png", "image/webp"].includes(asset.contentType))
    throw new Error(`Formato inválido: ${asset.contentType}; esperado JPEG, PNG ou WebP.`);
}

/** @param {MealImageAsset} asset @param {Uint8Array} bytes */
export function verifyImage(asset, bytes) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== asset.bytes || hash !== asset.sha256)
    throw new Error(`ARQUIVO CORROMPIDO: ${asset.id}; tamanho ou SHA-256 diverge do manifesto.`);
}
