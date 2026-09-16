// `expo-file-system/legacy`, como o resto do app: o módulo novo exporta `File` e
// `Directory`, e não as funções de caminho. Importado sem `/legacy`, o
// `deleteAsync` chega `undefined` e o PDF fica no cache do aparelho.
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { registrarFalha } from '@/lib/registro';
import { type ReportPdfData, reportHtml } from './reportPdf';

/**
 * Gera o PDF do relatório no aparelho e abre a folha de compartilhar (#312 §5).
 *
 * O arquivo é apagado assim que a folha fecha — compartilhada ou cancelada. Um
 * PDF com peso, gordura e a nota do especialista não fica no diretório de cache
 * esperando a próxima limpeza do sistema.
 *
 * @example await sharePeriodReport(dadosDoRelatorio);
 */
export async function sharePeriodReport(data: ReportPdfData): Promise<boolean> {
  let uri: string | null = null;
  try {
    const file = await Print.printToFileAsync({ html: reportHtml(data) });
    // O `expo-print` nomeia o arquivo com um uuid. Quem recebe lê o nome antes de
    // abrir, e o nome também não carrega identificador nenhum.
    uri = await comNomeLegivel(file.uri);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Relatório do período',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch {
    // Sem o erro no log: ele pode trazer o caminho do arquivo e o conteúdo que
    // falhou ao ser escrito (Art. 6°, VII).
    registrarFalha('progress.share_report');
    return false;
  } finally {
    if (uri) await apagar(uri);
  }
}

const NOME_DO_ARQUIVO = 'relatorio-do-periodo.pdf';

async function comNomeLegivel(uri: string): Promise<string> {
  const destino = `${FileSystem.cacheDirectory}${NOME_DO_ARQUIVO}`;
  // O de ontem pode ter sobrado se o sistema matou o app no meio da folha.
  await FileSystem.deleteAsync(destino, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: destino });
  return destino;
}

/** A limpeza nunca derruba o compartilhamento: o arquivo pode já ter sumido. */
async function apagar(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    registrarFalha('progress.discard_report_file');
  }
}
