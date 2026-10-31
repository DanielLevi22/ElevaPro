import { readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createImageKitStore } from "../web/src/modules/nutrition/services/media/imagekit.mjs";
import { createExerciseVideoCatalog } from "./exercise-videos/catalog.mjs";
import { publishExerciseVideos } from "./exercise-videos/index.mjs";
import { processExerciseVideos, validateProcessedVideo } from "./exercise-videos/process.mjs";
import { writeRecordingPlan } from "./exercise-videos/recording.mjs";

const root = fileURLToPath(new URL("../docs/catalog/exercises/", import.meta.url));
const [operation, filename] = process.argv.slice(2);

async function publish() {
  const processed = resolve(root, "videos/processed");
  const bundle = JSON.parse(await readFile(filename, "utf8"));
  bundle.release = JSON.parse(await readFile(join(root, "release.json"), "utf8"));
  const files = new Map();
  for (const clip of bundle.clips) {
    for (const asset of [clip.video, clip.poster]) {
      const local = resolve(processed, asset.path);
      if (!local.startsWith(`${processed}${sep}`))
        throw new Error(
          `Arquivo fora da pasta: ${asset.path}; esperado caminho relativo dentro de videos/processed.`,
        );
      const bytes = await readFile(local);
      if (asset === clip.video) validateProcessedVideo(local, bytes.length);
      files.set(asset.path, bytes);
    }
  }
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT ?? "";
  if (!process.env.IMAGEKIT_PRIVATE_KEY)
    throw new Error("ImageKit indisponível: esperado IMAGEKIT_PRIVATE_KEY restrita à CLI.");
  const published = await publishExerciseVideos(
    bundle,
    files,
    createExerciseVideoCatalog(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY),
    createImageKitStore(endpoint, process.env.IMAGEKIT_PRIVATE_KEY),
    endpoint,
  );
  await writeFile(
    join(processed, "publication.json"),
    `${JSON.stringify({ version: 1, published }, null, 2)}\n`,
  );
  console.log(
    `Publicados/conferidos ${published.length} exercícios. Mapeamento em videos/processed/publication.json.`,
  );
}

async function main() {
  if (operation === "plan") {
    console.log(await writeRecordingPlan(root));
    return;
  }
  if (operation === "process" && filename) {
    const bundle = await processExerciseVideos(root, JSON.parse(await readFile(filename, "utf8")));
    console.log(
      `Processados ${bundle.clips.length} clipes. Revise execução, corte e capa no manifesto antes de publicar.`,
    );
    return;
  }
  if (operation === "publish" && filename) return publish();
  throw new Error(
    `Operação inválida: ${operation}; esperado plan, process <edições.json> ou publish <manifesto.json>.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
