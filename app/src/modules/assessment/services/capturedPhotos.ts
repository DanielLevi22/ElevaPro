// `expo-file-system/legacy`, como o resto do app: importado sem `/legacy`, o
// `deleteAsync` chega `undefined` e a foto fica no cache.
import * as FileSystem from 'expo-file-system/legacy';
import { registrarFalha } from '@/lib/registro';

/**
 * O descarte das fotos do body scan no aparelho (#316 §3).
 *
 * As telas dizem "nenhuma foto é guardada", e até aqui isso valia só para o
 * servidor: a câmera grava `body-scan-<instante>.jpg` no cache, a análise grava
 * uma cópia reduzida em `ImageManipulator/`, e nada apagava nenhuma das duas.
 * Foto do corpo inteiro é dado biométrico (Art. 5°, II); guardá-la em claro,
 * fora de qualquer controle, esperando a limpeza do sistema, contradiz o que o
 * aluno leu antes de fotografar (Art. 6°, III; Art. 16).
 */

/** O nome que a câmera nativa dá a cada foto (`BodyScanPoseView.kt`). */
const CAPTURE_NAME = /^body-scan-\d+\.jpg$/;

/**
 * Apaga as fotos dadas. Arquivo que já sumiu não é erro, e uma falha não
 * interrompe as outras.
 *
 * @example await discardPhotos(Object.values(capturedImages));
 */
export async function discardPhotos(uris: readonly (string | undefined)[]): Promise<void> {
  await Promise.all(uris.filter((uri): uri is string => Boolean(uri)).map(discardPhoto));
}

/**
 * Apaga toda foto de body scan que sobrou no cache.
 *
 * O store não é persistido: se o sistema mata o app no meio do fluxo, os
 * caminhos se perdem, e só o nome do arquivo ainda leva até a foto. Roda no
 * começo de cada scan, antes de a primeira foto nova existir.
 *
 * @example await sweepLeftoverPhotos();
 */
export async function sweepLeftoverPhotos(): Promise<void> {
  const cache = FileSystem.cacheDirectory;
  if (!cache) return;
  try {
    const names = await FileSystem.readDirectoryAsync(cache);
    await discardPhotos(names.filter((name) => CAPTURE_NAME.test(name)).map((n) => cache + n));
  } catch {
    registrarFalha('body_scan.sweep_photos');
  }
}

async function discardPhoto(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Sem o caminho e sem o erro, que o repete: o nome do arquivo marca quando
    // a pessoa se fotografou (Art. 6°, VII).
    registrarFalha('body_scan.discard_photo');
  }
}
