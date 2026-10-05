import { randomUUID } from "node:crypto";
import { verifyImage } from "./manifest.mjs";

/** @typedef {import('@elevapro/shared').MealImageAsset} MealImageAsset */
/** @param {string} endpoint @param {string} privateKey */
export function createImageKitStore(endpoint, privateKey = "") {
  const base = new URL(`${endpoint.replace(/\/$/, "")}/`);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
    throw new Error("ImageKit não configurado: esperado endpoint HTTPS sem credenciais.");
  return {
    /** @param {MealImageAsset} asset */
    read: async (asset) => {
      const url = originalVerificationUrl(asset, base);
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
      if (!response.ok)
        throw new Error(
          `Leitura ImageKit recusada: HTTP ${response.status}; esperado original disponível.`,
        );
      return new Uint8Array(await response.arrayBuffer());
    },
    /** @param {MealImageAsset} asset @param {Uint8Array} bytes */
    write: async (asset, bytes) => {
      if (!privateKey)
        throw new Error("ImageKit não configurado: esperado chave privada do servidor.");
      const existing = await fetch(originalVerificationUrl(asset, base), {
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (existing.ok) {
        verifyImage(asset, new Uint8Array(await existing.arrayBuffer()));
        return;
      }
      if (existing.status !== 404)
        throw new Error(`Conferência ImageKit recusada: HTTP ${existing.status}.`);
      await uploadImage(asset, bytes, privateKey);
    },
  };
}

/** @param {MealImageAsset} asset @param {URL} base */
function originalVerificationUrl(asset, base) {
  const url = new URL(asset.path, base);
  url.searchParams.set("tr", "orig-true");
  // A conferência anterior ao upload pode deixar um 404 em cache na CDN.
  url.searchParams.set("verification", randomUUID());
  return url;
}

/** @param {MealImageAsset} asset @param {Uint8Array} bytes @param {string} privateKey */
async function uploadImage(asset, bytes, privateKey) {
  verifyImage(asset, bytes);
  const form = new FormData();
  const parts = asset.path.split("/");
  form.set("file", Buffer.from(bytes).toString("base64"));
  form.set("fileName", parts.pop() ?? "");
  form.set("folder", `/${parts.join("/")}`);
  form.set("useUniqueFileName", "false");
  form.set("overwriteFile", "false");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(
      `Publicação ImageKit recusada: HTTP ${response.status}; esperado upload sem sobrescrever versão.`,
    );
}
