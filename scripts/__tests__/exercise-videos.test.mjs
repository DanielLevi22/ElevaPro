import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createImageKitStore } from "../../web/src/modules/nutrition/services/media/imagekit.mjs";
import { createExerciseVideoCatalog } from "../exercise-videos/catalog.mjs";
import { publishExerciseVideos } from "../exercise-videos/index.mjs";

function fixture() {
  const files = new Map();
  const asset = (path, contentType) => {
    const bytes = Buffer.from(path);
    files.set(path, bytes);
    return {
      path,
      contentType,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  };
  const bundle = {
    version: 1,
    release: {
      imageReleaseRef: "restricted/term-001",
      quotaCheckedAt: "2026-10-31",
      privacyReviewRef: "restricted/review-001",
    },
    clips: [
      {
        name: "Agachamento livre",
        technicalReviewed: true,
        video: asset("exercises/squat/v1.mp4", "video/mp4"),
        poster: asset("exercises/squat/v1.jpg", "image/jpeg"),
      },
    ],
  };
  const rows = [{ id: "ex-1", name: "Agachamento livre", video_url: null }];
  const uploaded = new Map();
  let writes = 0;
  const catalog = {
    listOfficial: async () => rows.map((row) => ({ ...row })),
    publishIfEmpty: async (id, url) => {
      const row = rows.find((row) => row.id === id);
      if (row.video_url) return false;
      row.video_url = url;
      return true;
    },
  };
  const store = {
    write: async (asset, bytes) => {
      if (uploaded.has(asset.path)) return;
      uploaded.set(asset.path, bytes);
      writes++;
    },
  };
  return { bundle, files, catalog, store, rows, writes: () => writes };
}

test("publicação devolve exercício → endereço e repetir não duplica", async () => {
  const sample = fixture();
  const first = await publishExerciseVideos(
    sample.bundle,
    sample.files,
    sample.catalog,
    sample.store,
    "https://ik.imagekit.io/test/",
  );
  assert.deepEqual(first, [
    { name: "Agachamento livre", url: "https://ik.imagekit.io/test/exercises/squat/v1.mp4" },
  ]);
  assert.deepEqual(
    await publishExerciseVideos(
      sample.bundle,
      sample.files,
      sample.catalog,
      sample.store,
      "https://ik.imagekit.io/test/",
    ),
    first,
  );
  assert.equal(sample.writes(), 2);
});

test("nome ausente no catálogo recusa todo o lote antes de enviar", async () => {
  const sample = fixture();
  sample.bundle.clips.push({ ...sample.bundle.clips[0], name: "Nome que não existe" });
  await assert.rejects(
    publishExerciseVideos(
      sample.bundle,
      sample.files,
      sample.catalog,
      sample.store,
      "https://ik.imagekit.io/test",
    ),
    /Nome que não existe/,
  );
  assert.equal(sample.writes(), 0);
});

// LGPD, arts. 6º e 8º: imagem pública exige evidência de autorização para a finalidade e destinatário.
test("imagem de pessoa não é publicada sem referência ao termo assinado", async () => {
  const sample = fixture();
  sample.bundle.release.imageReleaseRef = "";
  await assert.rejects(
    publishExerciseVideos(
      sample.bundle,
      sample.files,
      sample.catalog,
      sample.store,
      "https://ik.imagekit.io/test",
    ),
    /imageReleaseRef/,
    "IMAGEM SEM AUTORIZAÇÃO: lote aceito sem referência ao termo assinado",
  );
  assert.equal(sample.writes(), 0, "IMAGEM SEM AUTORIZAÇÃO: arquivo enviado antes do aceite");
});

test("vídeo já publicado diferente não é sobrescrito", async () => {
  const sample = fixture();
  sample.rows[0].video_url = "https://previous.example/v1.mp4";
  await assert.rejects(
    publishExerciseVideos(
      sample.bundle,
      sample.files,
      sample.catalog,
      sample.store,
      "https://ik.imagekit.io/test",
    ),
    /Versão publicada: Agachamento livre/,
  );
  assert.equal(sample.writes(), 0);
});

test("integridade, revisão técnica e revisão de privacidade são conferidas antes do envio", async () => {
  for (const invalidate of [
    (sample) => {
      sample.bundle.clips[0].technicalReviewed = false;
    },
    (sample) => {
      sample.bundle.release.privacyReviewRef = "";
    },
    (sample) => {
      sample.bundle.release.quotaCheckedAt = "";
    },
    (sample) => {
      sample.files.set(sample.bundle.clips[0].video.path, Buffer.from("alterado"));
    },
  ]) {
    const sample = fixture();
    invalidate(sample);
    await assert.rejects(
      publishExerciseVideos(
        sample.bundle,
        sample.files,
        sample.catalog,
        sample.store,
        "https://ik.imagekit.io/test",
      ),
    );
    assert.equal(sample.writes(), 0);
  }
});

test("publicação real preserva exercício do especialista e confere uploads sem sobrescrever", async () => {
  const sample = fixture();
  const rows = [
    {
      id: "official",
      name: "Agachamento livre",
      video_url: null,
      is_verified: true,
      created_by: null,
    },
    {
      id: "private",
      name: "Agachamento livre",
      video_url: "https://specialist.test/own.mp4",
      is_verified: true,
      created_by: "specialist-1",
    },
  ];
  const uploaded = new Map();
  const originalFetch = globalThis.fetch;
  let uploads = 0;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : (input.url ?? input.href));
    const method = options.method ?? input.method ?? "GET";
    if (url.hostname === "db.example.test") {
      const eligible = rows.filter(
        (row) =>
          (url.searchParams.get("is_verified") !== "eq.true" || row.is_verified) &&
          (url.searchParams.get("created_by") !== "is.null" || row.created_by === null) &&
          (url.searchParams.get("video_url") !== "is.null" || row.video_url === null),
      );
      if (method === "PATCH") {
        assert.equal(
          eligible.length,
          1,
          "EXERCÍCIO PARTICULAR ALTERADO: escrita deve alcançar só oficial sem vídeo",
        );
        Object.assign(eligible[0], JSON.parse(options.body));
      }
      return Response.json(eligible);
    }
    if (url.hostname === "ik.imagekit.io") {
      const bytes = uploaded.get(url.pathname.replace(/^\/test\//, ""));
      return bytes ? new Response(bytes) : new Response(null, { status: 404 });
    }
    assert.equal(url.href, "https://upload.imagekit.io/api/v1/files/upload");
    assert.equal(options.body.get("overwriteFile"), "false");
    assert.equal(options.body.get("useUniqueFileName"), "false");
    const path = `${options.body.get("folder").slice(1)}/${options.body.get("fileName")}`;
    assert.equal(uploaded.has(path), false);
    uploaded.set(path, Buffer.from(options.body.get("file"), "base64"));
    uploads++;
    return Response.json({});
  };
  try {
    const catalog = createExerciseVideoCatalog("https://db.example.test", "test-server-key");
    const store = createImageKitStore("https://ik.imagekit.io/test", "test-image-key");
    const first = await publishExerciseVideos(
      sample.bundle,
      sample.files,
      catalog,
      store,
      "https://ik.imagekit.io/test",
    );
    assert.deepEqual(
      await publishExerciseVideos(
        sample.bundle,
        sample.files,
        catalog,
        store,
        "https://ik.imagekit.io/test",
      ),
      first,
    );
    assert.equal(uploads, 2);
    assert.equal(rows[1].video_url, "https://specialist.test/own.mp4");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
