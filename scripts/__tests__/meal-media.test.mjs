import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createImageKitStore } from "../../web/src/modules/nutrition/services/media/imagekit.mjs";
import {
  createDirectoryStore,
  exportMealMedia,
  restoreMealMedia,
  restoreMealMediaBundle,
} from "../meal-media/index.mjs";

test("exportar e restaurar mantém identidade, versão e bytes em outro destino", async () => {
  const root = await mkdtemp(join(tmpdir(), "eleva-media-"));
  const original = Buffer.from("foto ilustrativa de teste");
  const asset = {
    id: "photo-chicken",
    version: 1,
    path: "meals/photo-chicken/v1.jpg",
    bytes: original.length,
    sha256: createHash("sha256").update(original).digest("hex"),
    contentType: "image/jpeg",
  };
  const manifest = { version: 1, assets: [asset] };
  await mkdir(join(root, "source/meals/photo-chicken"), { recursive: true });
  await writeFile(join(root, "source", asset.path), original);
  await exportMealMedia(manifest, createDirectoryStore(join(root, "source")), join(root, "backup"));
  const restored = await restoreMealMedia(
    join(root, "backup"),
    createDirectoryStore(join(root, "other")),
  );
  assert.deepEqual(restored, manifest);
  assert.deepEqual(await readFile(join(root, "other", asset.path)), original);
  assert.deepEqual(
    await restoreMealMedia(join(root, "backup"), createDirectoryStore(join(root, "other"))),
    manifest,
  );
});

test("um backup corrompido não publica sequer o primeiro arquivo", async () => {
  const original = Buffer.from("original");
  const asset = {
    id: "photo-test",
    version: 1,
    path: "meals/v1.jpg",
    bytes: original.length,
    sha256: createHash("sha256").update(original).digest("hex"),
    contentType: "image/jpeg",
  };
  let writes = 0;
  const destination = {
    read: async () => original,
    write: async () => {
      writes++;
    },
  };
  await assert.rejects(
    restoreMealMediaBundle(
      {
        manifest: {
          version: 1,
          assets: [{ ...asset, id: "photo-valid", path: "meals/valid.jpg" }, asset],
        },
        files: {
          "meals/valid.jpg": original.toString("base64"),
          [asset.path]: Buffer.from("corrompido").toString("base64"),
        },
      },
      destination,
    ),
    /ARQUIVO CORROMPIDO/,
  );
  assert.equal(writes, 0, "ARQUIVO CORROMPIDO PUBLICADO: nenhum upload deve começar");
});

test("um caminho que escapa do backup é recusado antes de ler ou publicar", async () => {
  let writes = 0;
  const destination = {
    read: async () => new Uint8Array(),
    write: async () => {
      writes++;
    },
  };
  await assert.rejects(
    restoreMealMediaBundle(
      {
        manifest: {
          version: 1,
          assets: [
            {
              id: "photo-test",
              version: 1,
              path: "../outside.jpg",
              bytes: 1,
              sha256: "0".repeat(64),
              contentType: "image/jpeg",
            },
          ],
        },
        files: {},
      },
      destination,
    ),
    /Caminho inválido/,
  );
  assert.equal(writes, 0);
});

test("publicar no ImageKit e repetir a restauração preserva os bytes sem reenviar a versão", async () => {
  const original = Buffer.from("imagem original do catálogo");
  const asset = {
    id: "photo-chicken",
    version: 1,
    path: "meal-images/photo-chicken-v1.jpg",
    bytes: original.length,
    sha256: createHash("sha256").update(original).digest("hex"),
    contentType: "image/jpeg",
  };
  const bundle = {
    manifest: { version: 1, assets: [asset] },
    files: { [asset.path]: original.toString("base64") },
  };
  const savedFetch = globalThis.fetch;
  let stored = null;
  let uploads = 0;
  const cachedMisses = new Set();
  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "https://upload.imagekit.io/api/v1/files/upload") {
      uploads++;
      assert.equal(options.body.get("fileName"), "photo-chicken-v1.jpg");
      assert.equal(options.body.get("folder"), "/meal-images");
      assert.equal(options.body.get("overwriteFile"), "false");
      stored = Buffer.from(options.body.get("file"), "base64");
      return new Response("{}", { status: 200 });
    }
    assert.equal(new URL(url).searchParams.get("tr"), "orig-true");
    assert.ok(new URL(url).pathname.endsWith(`/${asset.path}`));
    assert.equal(options.headers, undefined, "Credencial privada não pode ir à CDN pública");
    if (cachedMisses.has(String(url))) return new Response(null, { status: 404 });
    if (stored) return new Response(stored);
    cachedMisses.add(String(url));
    return new Response(null, { status: 404 });
  };
  try {
    const store = createImageKitStore("https://cdn.example.test/catalog", "private-test-key");
    assert.deepEqual(await restoreMealMediaBundle(bundle, store), bundle.manifest);
    await restoreMealMediaBundle(bundle, store);
    assert.equal(uploads, 1);
    assert.deepEqual(stored, original);
  } finally {
    globalThis.fetch = savedFetch;
  }
});
