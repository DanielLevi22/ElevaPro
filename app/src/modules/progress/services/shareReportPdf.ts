import { sharePdf } from '@/shared/pdf/sharePdf';
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
  return sharePdf({
    html: reportHtml(sheet),
    fileName: 'relatorio-do-periodo.pdf',
    sheetTitle: 'Relatório do período',
    failureEvent: 'progress.share_report',
    discardEvent: 'progress.discard_report_file',
  });
}
