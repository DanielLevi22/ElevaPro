import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

function probe(filename) {
  try {
    return JSON.parse(
      execFileSync(
        process.env.FFPROBE_PATH || "ffprobe",
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", filename],
        { encoding: "utf8", maxBuffer: 1024 * 1024 },
      ),
    );
  } catch {
    throw new Error(`Inspeção recusada: ${filename}; esperado FFprobe instalado e mídia válida.`);
  }
}

function runFfmpeg(argumentsList, name) {
  try {
    execFileSync(
      process.env.FFMPEG_PATH || "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-n", ...argumentsList],
      { stdio: "pipe" },
    );
  } catch {
    throw new Error(
      `Processamento recusado: ${name}; esperado FFmpeg com libx264 e saída ainda inexistente. Confira o arquivo e a versão.`,
    );
  }
}

function sourcePath(root, filename) {
  if (typeof filename !== "string" || !/^[a-z0-9-]+\.(mp4|mov|m4v)$/i.test(filename))
    throw new Error(
      `Bruto inválido: ${filename}; esperado <slug>.mp4, .mov ou .m4v dentro de videos/raw.`,
    );
  const base = resolve(root, "videos/raw");
  const source = resolve(base, filename);
  if (!source.startsWith(`${base}${sep}`)) throw new Error(`Bruto fora da pasta: ${filename}.`);
  return source;
}

function cropFilter(crop) {
  if (crop === undefined) return "";
  const { width, height, x, y } = crop;
  if (
    ![width, height, x, y].every(Number.isSafeInteger) ||
    width < 2 ||
    height < 2 ||
    x < 0 ||
    y < 0
  )
    throw new Error(
      `Recorte inválido: ${JSON.stringify(crop)}; esperado width/height positivos e x/y não negativos inteiros.`,
    );
  return `crop=${width}:${height}:${x}:${y},`;
}

function validateEdit(edit, shot, source) {
  if (
    !shot ||
    !Number.isSafeInteger(edit.version) ||
    edit.version < 1 ||
    !Number.isFinite(edit.start) ||
    edit.start < 0 ||
    !Number.isFinite(edit.duration) ||
    edit.duration < 4 ||
    edit.duration > 8
  )
    throw new Error(
      `Corte inválido: ${edit.name}; esperado nome do roteiro, versão positiva, início ≥ 0 e duração de 4–8 s.`,
    );
  const metadata = probe(source);
  const stream = metadata.streams.find((stream) => stream.codec_type === "video");
  if (!stream || edit.start + edit.duration > Number(metadata.format.duration) + 0.05)
    throw new Error(
      `Corte fora do bruto: ${edit.name}; esperado intervalo inteiramente dentro do vídeo.`,
    );
  if (
    edit.crop &&
    (edit.crop.x + edit.crop.width > stream.width || edit.crop.y + edit.crop.height > stream.height)
  )
    throw new Error(
      `Recorte fora do bruto: ${edit.name}; esperado retângulo dentro de ${stream.width}×${stream.height}.`,
    );
}

async function fileAsset(root, path, contentType) {
  const bytes = await readFile(join(root, "videos/processed", path));
  return {
    path,
    contentType,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Corta um lote de brutos; a aprovação humana ocorre no manifesto produzido. @example processExerciseVideos(root, edits) */
export async function processExerciseVideos(root, edits) {
  const plan = JSON.parse(await readFile(join(root, "recording-plan.json"), "utf8"));
  if (edits?.version !== 1 || !Array.isArray(edits.clips) || edits.clips.length === 0)
    throw new Error("Edição inválida: esperado versão 1 e clips não vazio.");
  if (edits.manifest !== undefined && !/^[a-z0-9-]+\.json$/.test(edits.manifest))
    throw new Error(`Manifesto inválido: ${edits.manifest}; esperado nome simples <lote>.json.`);
  const names = new Set();
  const prepared = edits.clips.map((edit) => {
    const shot = plan.shots.find((shot) => shot.name === edit.name);
    const source = sourcePath(root, edit.source);
    validateEdit(edit, shot, source);
    cropFilter(edit.crop);
    if (names.has(edit.name))
      throw new Error(`Edição duplicada: ${edit.name}; esperado um corte por exercício.`);
    names.add(edit.name);
    return { edit, shot, source };
  });
  const clips = [];
  for (const { edit, shot, source } of prepared)
    clips.push(await processClip(root, edit, shot, source));
  const bundle = {
    version: 1,
    release: { imageReleaseRef: "", privacyReviewRef: "", quotaCheckedAt: "" },
    clips,
  };
  // Não sobrescrever revisões anteriores: cada lote recebe seu próprio manifesto.
  await writeFile(
    join(root, "videos/processed", edits.manifest ?? "manifest.json"),
    `${JSON.stringify(bundle, null, 2)}\n`,
    { flag: "wx" },
  );
  return bundle;
}

async function processClip(root, edit, shot, source) {
  const path = `exercises/${shot.slug}/v${edit.version}`;
  const output = join(root, "videos/processed", path);
  await mkdir(resolve(output, ".."), { recursive: true });
  const filter = `${cropFilter(edit.crop)}scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  runFfmpeg(
    [
      "-ss",
      String(edit.start),
      "-i",
      source,
      "-t",
      String(edit.duration),
      "-map",
      "0:v:0",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-an",
      "-sn",
      "-dn",
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "28",
      "-maxrate",
      "700k",
      "-bufsize",
      "700k",
      "-r",
      "30",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${output}.mp4`,
    ],
    edit.name,
  );
  const video = await fileAsset(root, `${path}.mp4`, "video/mp4");
  validateProcessedVideo(`${output}.mp4`, video.bytes);
  runFfmpeg(
    [
      "-ss",
      "0",
      "-i",
      `${output}.mp4`,
      "-frames:v",
      "1",
      "-map_metadata",
      "-1",
      "-q:v",
      "3",
      `${output}.jpg`,
    ],
    edit.name,
  );
  return {
    name: edit.name,
    technicalReviewed: false,
    video,
    poster: await fileAsset(root, `${path}.jpg`, "image/jpeg"),
  };
}

/** Confere o arquivo real antes de enviar, inclusive quando o manifesto foi editado. @example validateProcessedVideo(file, bytes) */
export function validateProcessedVideo(filename, bytes) {
  const metadata = probe(filename);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const duration = Number(metadata.format.duration);
  if (
    !video ||
    video.codec_name !== "h264" ||
    video.pix_fmt !== "yuv420p" ||
    video.width !== 1280 ||
    video.height !== 720 ||
    metadata.streams.some((stream) => stream.codec_type !== "video") ||
    duration < 4 ||
    duration > 8.05 ||
    bytes >= 1_000_000
  )
    throw new Error(
      `Clipe inválido: ${filename}; esperado MP4 H.264 1280×720, yuv420p, sem áudio, 4–8 s e menos de 1 MB.`,
    );
}
