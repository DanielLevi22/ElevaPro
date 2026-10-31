import { createHash } from "node:crypto";
import { restoreMealMediaBundle } from "../../web/src/modules/nutrition/services/media/archive.mjs";

/** Publica e só retorna conclusão depois de conferir os bytes no destino. @example publishCandidateImage(candidate, jpeg, store) */
/** @param {import('./candidates.mjs').MealCandidate} candidate @param {Uint8Array} bytes @param {import('../../web/src/modules/nutrition/services/media/archive.mjs').MediaStore} destination */
export async function publishCandidateImage(candidate, bytes, destination) {
  if (!/^candidate-[a-f0-9]{16}$/.test(candidate.id))
    throw new Error("Candidato inválido: esperado candidate seguido de hash de 16 caracteres.");
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
    throw new Error("Formato inválido: esperado original JPEG.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const asset = {
    id: `photo-${candidate.id}`,
    version: 1,
    path: `meal-images/photo-${candidate.id}-v1-${sha256.slice(0, 12)}.jpg`,
    bytes: bytes.byteLength,
    sha256,
    contentType: "image/jpeg",
  };
  await restoreMealMediaBundle(
    {
      manifest: { version: 1, assets: [asset] },
      files: { [asset.path]: Buffer.from(bytes).toString("base64") },
    },
    destination,
  );
  return {
    candidateId: candidate.id,
    imageStatus: "completed",
    reviewStatus: "pending",
    asset,
    verifiedAt: new Date().toISOString(),
  };
}
