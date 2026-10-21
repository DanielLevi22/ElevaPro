import type jsPDF from "jspdf";
import { formatDate } from "./formatDate";

/**
 * A identidade dos PDFs do especialista (dieta e treino): o cabeçalho escuro
 * com ELEVA PRO em neon, o aluno à direita, a linha neon e o rodapé do
 * protocolo. Um lugar só, para os dois documentos saírem com o mesmo desenho.
 */

export const PDF_COLORS = {
  primary: [204, 255, 0],
  text: [40, 40, 40],
  tableHead: [40, 40, 40],
  shade: [252, 252, 252],
  line: [230, 230, 230],
} as const;

const HEADER_HEIGHT = 35;
const CROSS = 0.8;
const MARGIN = 5;

interface BrandHeader {
  studentName: string;
  professionalName: string;
  /** A linha neon sob o nome do aluno, ex.: "VALOR DE VIGÊNCIA: 01 ago 2026 - 29 ago 2026". */
  caption: string | null;
}

/**
 * Desenha o cabeçalho e devolve o Y onde o conteúdo começa.
 *
 * @example const y = drawBrandHeader(doc, { studentName, professionalName, caption });
 */
export function drawBrandHeader(doc: jsPDF, header: BrandHeader): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const [r, g, b] = PDF_COLORS.primary;

  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");
  doc.setFillColor(28, 28, 28);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT * 0.45, "F");

  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.1);
  doc.line(MARGIN, MARGIN - CROSS, MARGIN, MARGIN + CROSS);
  doc.line(MARGIN - CROSS, MARGIN, MARGIN + CROSS, MARGIN);
  doc.line(pageWidth - MARGIN, MARGIN - CROSS, pageWidth - MARGIN, MARGIN + CROSS);
  doc.line(pageWidth - MARGIN - CROSS, MARGIN, pageWidth - MARGIN + 1, MARGIN);

  doc.setFontSize(26);
  doc.setTextColor(r, g, b);
  doc.setFont("helvetica", "bold");
  doc.text("ELEVA", 15, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(22);
  doc.text("PRO", 15 + doc.getTextWidth("ELEVA") + 2, 18, { charSpace: 1.5 });

  doc.setFontSize(8.5);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "bold");
  doc.text(`DESENVOLVIDO POR // ${header.professionalName.toUpperCase()}`, 15, 26);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`[ ${header.studentName.toUpperCase()} ]`, pageWidth - 15, 18, {
    align: "right",
    charSpace: 0.5,
  });
  if (header.caption) {
    doc.setFontSize(8);
    doc.setTextColor(r, g, b);
    doc.text(header.caption, pageWidth - 15, 26, { align: "right" });
  }

  doc.setFillColor(r, g, b);
  doc.rect(0, HEADER_HEIGHT, pageWidth, 1.2, "F");
  return HEADER_HEIGHT + 15;
}

/**
 * O rodapé do protocolo em todas as páginas, com a data de geração.
 *
 * @example drawProtocolFooter(doc);
 */
export function drawProtocolFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = formatDate(new Date().toISOString(), "dateTime");
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `PROTOCOLO OFICIAL // AUTENTICADO POR ELEVA PRO // ${generatedAt} // PÁGINA ${page} DE ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );
  }
}

/** "VALOR DE VIGÊNCIA: 01 ago 2026 - 29 ago 2026", ou nulo sem as duas datas. */
export function validityCaption(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return `VALOR DE VIGÊNCIA: ${formatDate(start, "medium")}  -  ${formatDate(end, "medium")}`;
}

/** Nome de arquivo sem acento nem espaço: "Protocolo_Treino_A.pdf". */
export function protocolFileName(name: string | null, fallback: string): string {
  return `Protocolo_${(name || fallback).replace(/[^a-z0-9]/gi, "_")}.pdf`;
}
