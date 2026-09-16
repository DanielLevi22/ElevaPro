import type { MedidaDaFoto } from '../../../../modules/body-scan-pose';
import { discardPhotos } from './capturedPhotos';

export interface CaptureMeasurer {
  measure: (uri: string, isSide: boolean) => Promise<MedidaDaFoto | null | undefined>;
}

export interface MeasuredCaptureOptions {
  manualFallback: boolean;
}

/**
 * Mede uma foto antes de ela entrar no scan e descarta a rejeitada.
 *
 * A saída manual é a exceção: depois de 45 segundos sem enquadrar, ela pode
 * manter a foto sem geometria, marcada como tal no resultado.
 *
 * @example await measureCapturedPhoto(uri, false, camera, { manualFallback: false })
 */
export async function measureCapturedPhoto(
  uri: string,
  isSide: boolean,
  measurer: CaptureMeasurer,
  options: MeasuredCaptureOptions
): Promise<MedidaDaFoto | null> {
  const measurement = (await measurer.measure(uri, isSide).catch(() => null)) ?? null;
  if (!measurement && !options.manualFallback) await discardPhotos([uri]);
  return measurement;
}
