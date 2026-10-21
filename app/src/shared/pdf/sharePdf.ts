// `expo-file-system/legacy`, como o resto do app: o módulo novo exporta `File` e
// `Directory`, e não as funções de caminho. Importado sem `/legacy`, o
// `deleteAsync` chega `undefined` e o PDF fica no cache do aparelho.
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { registrarFalha } from '@/lib/registro';

export interface PdfToShare {
  html: string;
  /** O nome que quem recebe vê, sem identificador: "relatorio-do-periodo.pdf". */
  fileName: string;
  sheetTitle: string;
  /** Os eventos registrados se falhar — só o nome, nunca o conteúdo. */
  failureEvent: string;
  discardEvent: string;
}

/**
 * Gera um PDF no aparelho, abre a folha de compartilhar do sistema e apaga o
 * arquivo assim que ela fecha — compartilhado ou cancelado. Nada passa pelo
 * servidor, e o arquivo não fica no cache esperando a próxima limpeza.
 *
 * @example await sharePdf({ html, fileName: 'treino.pdf', sheetTitle: 'Treino', failureEvent: 'workout.share_pdf', discardEvent: 'workout.discard_pdf' })
 */
export async function sharePdf(pdf: PdfToShare): Promise<boolean> {
  let uri: string | null = null;
  try {
    const file = await Print.printToFileAsync({ html: pdf.html });
    // O `expo-print` nomeia o arquivo com um uuid. Quem recebe lê o nome antes de
    // abrir, e o nome também não carrega identificador nenhum.
    uri = await withReadableName(file.uri, pdf.fileName);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: pdf.sheetTitle,
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch {
    // Sem o erro no log: ele pode trazer o caminho do arquivo e o conteúdo que
    // falhou ao ser escrito (Art. 6°, VII).
    registrarFalha(pdf.failureEvent);
    return false;
  } finally {
    if (uri) await discard(uri, pdf.discardEvent);
  }
}

async function withReadableName(uri: string, name: string): Promise<string> {
  const target = `${FileSystem.cacheDirectory}${name}`;
  // O de ontem pode ter sobrado se o sistema matou o app no meio da folha.
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: target });
  return target;
}

/** A limpeza nunca derruba o compartilhamento: o arquivo pode já ter sumido. */
async function discard(uri: string, event: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    registrarFalha(event);
  }
}
