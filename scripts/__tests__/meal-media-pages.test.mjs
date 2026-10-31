import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createDirectoryStore, restoreMealMedia } from "../meal-media/index.mjs";
import { exportMealMediaPage } from "../meal-media/pagination.mjs";

test("um catálogo com 501 imagens pode ser exportado e restaurado em partes completas", async () => {
  const root = await mkdtemp(join(tmpdir(), "eleva-media-pages-"));
  const original = Buffer.from("imagem para backup portátil");
  const assets = Array.from({ length: 501 }, (_, index) => ({
    id: `photo-${index}`,
    version: 1,
    path: `meal-images/photo-${index}.jpg`,
    bytes: original.length,
    sha256: createHash("sha256").update(original).digest("hex"),
    contentType: "image/jpeg",
  }));
  await mkdir(join(root, "source/meal-images"), { recursive: true });
  for (const asset of assets) await writeFile(join(root, "source", asset.path), original);
  const catalog = { version: 1, assets };
  const source = createDirectoryStore(join(root, "source"));
  const first = await exportMealMediaPage(catalog, source, join(root, "part-1"), 0);
  const last = await exportMealMediaPage(catalog, source, join(root, "part-2"), 500);
  assert.deepEqual([...first.assets, ...last.assets], assets);
  assert.equal(first.assets.length, 500);
  assert.equal(last.assets.length, 1);
  const destination = createDirectoryStore(join(root, "destination"));
  await restoreMealMedia(join(root, "part-1"), destination);
  await restoreMealMedia(join(root, "part-2"), destination);
  for (const asset of assets)
    assert.deepEqual(await readFile(join(root, "destination", asset.path)), original);
});

test("partes vazias e limites fora de 1 a 500 são recusados antes de acessar arquivos", async () => {
  const catalog = { version: 1, assets: [{}] };
  const unavailable = {
    read: async () => assert.fail("não deveria ler"),
    write: async () => assert.fail("não deveria escrever"),
  };
  for (const offset of [-1, 0.5, 1, Number.NaN])
    await assert.rejects(
      exportMealMediaPage(catalog, unavailable, "unused", offset),
      /Início inválido/,
    );
  for (const limit of [0, 501, 1.5, Number.NaN])
    await assert.rejects(
      exportMealMediaPage(catalog, unavailable, "unused", 0, limit),
      /Tamanho de parte inválido/,
    );
});

test("uma parte corrompida não ganha manifesto de backup concluído", async () => {
  const root = await mkdtemp(join(tmpdir(), "eleva-media-corrupted-page-"));
  const original = Buffer.from("original");
  const asset = {
    id: "photo-corrupt",
    version: 1,
    path: "meal-images/photo-corrupt.jpg",
    bytes: original.length,
    sha256: createHash("sha256").update(original).digest("hex"),
    contentType: "image/jpeg",
  };
  await mkdir(join(root, "source/meal-images"), { recursive: true });
  await writeFile(join(root, "source", asset.path), "bytes incorretos");
  await assert.rejects(
    exportMealMediaPage(
      { version: 1, assets: [asset] },
      createDirectoryStore(join(root, "source")),
      join(root, "backup"),
      0,
    ),
    /ARQUIVO CORROMPIDO/,
  );
  await assert.rejects(readFile(join(root, "backup/manifest.json")), { code: "ENOENT" });
});
