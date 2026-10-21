import { compartilharPdf } from '@/shared/pdf/compartilharPdf';
import { type ReportSheet, reportHtml } from './reportPdf';

/**
 * Gera o PDF do relatório no aparelho e abre a folha de compartilhar (#312 §5).
 *
 * O arquivo é apagado assim que a folha fecha — compartilhada ou cancelada. Um
 * PDF com peso, gordura e a nota do especialista não fica no diretório de cache
 * esperando a próxima limpeza do sistema.
 *
 * @example await sharePeriodReport(folhaDoRelatorio);
 */
export function sharePeriodReport(sheet: ReportSheet): Promise<boolean> {
  return compartilharPdf({
    html: reportHtml(sheet),
    nomeDoArquivo: 'relatorio-do-periodo.pdf',
    tituloDaFolha: 'Relatório do período',
    eventoDeFalha: 'progress.share_report',
    eventoDeDescarte: 'progress.discard_report_file',
  });
}
