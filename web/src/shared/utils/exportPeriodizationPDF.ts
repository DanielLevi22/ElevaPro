import type { PeriodizationSheet, PeriodizationSheetPhase } from "@elevapro/shared";
import jsPDF from "jspdf";
import { drawWorkoutSection } from "./exportWorkoutPDF";
import { formatDate } from "./formatDate";
import {
  drawBrandHeader,
  drawProtocolFooter,
  PDF_COLORS,
  protocolFileName,
  validityRange,
} from "./pdfBrand";

interface PeriodizationPdfInput {
  sheet: PeriodizationSheet;
  studentName: string;
  /** Nulo quando quem exporta é o próprio aluno: a linha não aparece. */
  professionalName: string | null;
}

const LEFT = 15;
const BOTTOM_MARGIN = 22;
const PAGE_TOP = 20;
const PHASE_BAND_HEIGHT = 10;

/**
 * O plano completo em PDF, no desenho do protocolo da dieta: a periodização, e
 * para cada fase uma faixa com nome e datas seguida dos treinos dela, cada um
 * com a tabela das séries do PDF do treino avulso.
 *
 * @example exportPeriodizationToPDF({ sheet: buildPeriodizationSheet(plano), studentName, professionalName })
 */
export function exportPeriodizationToPDF({
  sheet,
  studentName,
  professionalName,
}: PeriodizationPdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawBrandHeader(doc, {
    documentLabel: "PLANO DE TREINO COMPLETO",
    studentName,
    professionalName,
    validity: validityRange(sheet.startDate, sheet.endDate),
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(sheet.name.toUpperCase(), LEFT, y - 3);
  if (sheet.objective) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`OBJETIVO: ${sheet.objective}`, LEFT, y + 3);
    y += 6;
  }
  y += 6;

  for (const phase of sheet.phases) {
    y = drawPhase(doc, phase, y);
  }

  drawProtocolFooter(doc);
  doc.save(protocolFileName(sheet.name, "Plano"));
}

/** A faixa da fase e os treinos dela. Devolve o Y abaixo do último treino. */
function drawPhase(doc: jsPDF, phase: PeriodizationSheetPhase, start: number): number {
  let y = ensureSpace(doc, start, PHASE_BAND_HEIGHT + 30);
  drawPhaseBand(doc, phase, y);
  y += PHASE_BAND_HEIGHT + 8;

  if (phase.workouts.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Sem treinos nesta fase", LEFT, y);
    return y + 10;
  }
  for (const workout of phase.workouts) {
    y = ensureSpace(doc, y, 30);
    y = drawWorkoutSection(doc, workout, y) + 12;
  }
  return y;
}

function drawPhaseBand(doc: jsPDF, phase: PeriodizationSheetPhase, y: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const [r, g, b] = PDF_COLORS.primary;
  doc.setFillColor(20, 20, 20);
  doc.rect(LEFT, y, pageWidth - LEFT * 2, PHASE_BAND_HEIGHT, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(r, g, b);
  doc.text(`FASE ${phase.order} // ${phase.name.toUpperCase()}`, LEFT + 4, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `${formatDate(phase.startDate, "medium")}  -  ${formatDate(phase.endDate, "medium")}`,
    pageWidth - LEFT - 4,
    y + 6.5,
    { align: "right" },
  );
}

/** Abre página nova quando o que vem não cabe antes do rodapé. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - BOTTOM_MARGIN) return y;
  doc.addPage();
  return PAGE_TOP;
}
