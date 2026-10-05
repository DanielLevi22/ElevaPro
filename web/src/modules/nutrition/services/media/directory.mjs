import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { verifyImage } from "./manifest.mjs";

/** @typedef {import('@elevapro/shared').MealImageAsset} MealImageAsset */

/** Armazena originais sem sobrescrever versões. @example createDirectoryStore('/backup') */
/** @param {string} root */
export function createDirectoryStore(root) {
  const base = resolve(root);
  return {
    /** @param {MealImageAsset} asset */
    read: async (asset) => readFile(await safePath(base, asset.path)),
    /** @param {MealImageAsset} asset @param {Uint8Array} bytes */
    write: async (asset, bytes) => {
      const target = await safePath(base, asset.path);
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(target, bytes, { flag: "wx" });
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== "EEXIST") throw error;
        verifyImage(asset, await readFile(target));
      }
    },
  };
}

/** @param {string} base @param {string} key */
async function safePath(base, key) {
  const target = resolve(base, key);
  const offset = relative(base, target);
  if (!offset || isAbsolute(offset) || offset.startsWith(`..${sep}`) || offset === "..")
    throw new Error(`Caminho fora do destino: ${key}; esperado caminho relativo interno.`);
  let cursor = target;
  while (true) {
    try {
      if ((await lstat(cursor)).isSymbolicLink())
        throw new Error(`Link simbólico recusado: ${key}.`);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") throw error;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return target;
}
