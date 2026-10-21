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

const HEADER_HEIGHT = 32;
const SIDE = 15;
/** Largura máxima de um valor à direita: nome longo é cortado com "…". */
const MAX_VALUE_WIDTH = 85;
const ROW_Y = [11, 18, 25] as const;

interface BrandHeader {
  /** O tipo do documento, sob a marca: "PROTOCOLO DE TREINO". */
  documentLabel: string;
  studentName: string;
  /** Nulo no plano próprio do Praticante: a linha do profissional não aparece. */
  professionalName: string | null;
  /** "20 out 2026 – 19 nov 2026", ou nulo sem período. */
  validity: string | null;
}

/**
 * Desenha o cabeçalho e devolve o Y onde o conteúdo começa: a marca e o tipo do
 * documento à esquerda; aluno, profissional e vigência à direita, cada um com o
 * seu rótulo; a linha neon embaixo.
 *
 * @example const y = drawBrandHeader(doc, { documentLabel: "PROTOCOLO DE TREINO", studentName, professionalName, validity });
 */
export function drawBrandHeader(doc: jsPDF, header: BrandHeader): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const [r, g, b] = PDF_COLORS.primary;

  doc.setFillColor(14, 14, 14);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(r, g, b);
  doc.text("ELEVA", SIDE, 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("PRO", SIDE + doc.getTextWidth("ELEVA") + 1.5, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(header.documentLabel.toUpperCase(), SIDE, 24);

  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: "ALUNO", value: header.studentName },
    ...(header.professionalName ? [{ label: "PROFISSIONAL", value: header.professionalName }] : []),
    ...(header.validity ? [{ label: "VIGÊNCIA", value: header.validity, accent: true }] : []),
  ];
  for (const [index, row] of rows.entries()) {
    drawInfoRow(doc, row, pageWidth - SIDE, ROW_Y[index] ?? 25);
  }

  doc.setFillColor(r, g, b);
  doc.rect(0, HEADER_HEIGHT, pageWidth, 1, "F");
  return HEADER_HEIGHT + 15;
}

/** "ALUNO  Ana Souza", alinhado à direita em `right`, sem passar da margem. */
function drawInfoRow(
  doc: jsPDF,
  row: { label: string; value: string; accent?: boolean },
  right: number,
  y: number,
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const value = fitText(doc, row.value, MAX_VALUE_WIDTH);
  const valueWidth = doc.getTextWidth(value);
  if (row.accent) doc.setTextColor(...PDF_COLORS.primary);
  else doc.setTextColor(255, 255, 255);
  doc.text(value, right, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(row.label, right - valueWidth - 3, y, { align: "right" });
}

/** Corta com "…" o texto que não cabe na largura, na fonte atual. */
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
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

/** "20 out 2026 – 19 nov 2026", ou nulo sem as duas datas. */
export function validityRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return `${formatDate(start, "medium")} – ${formatDate(end, "medium")}`;
}

/** Nome de arquivo sem acento nem espaço: "Protocolo_Treino_A.pdf". */
export function protocolFileName(name: string | null, fallback: string): string {
  return `Protocolo_${(name || fallback).replace(/[^a-z0-9]/gi, "_")}.pdf`;
}
