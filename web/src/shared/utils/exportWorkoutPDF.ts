import {
  buildWorkoutSheet,
  type SetPlan,
  type WorkoutSheetExercise,
  type WorkoutSheetSet,
} from "@elevapro/shared";
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import {
  drawBrandHeader,
  drawProtocolFooter,
  PDF_COLORS,
  protocolFileName,
  validityCaption,
} from "./pdfBrand";

interface WorkoutForPdf {
  title: string;
  exercises: {
    order_index: number;
    notes: string | null;
    set_plan: SetPlan;
    exercise?: { name: string; muscle_group?: string | null } | null;
  }[];
}

interface WorkoutPdfInput {
  workout: WorkoutForPdf;
  studentName: string;
  professionalName: string;
  /** A fase do treino, quando ele pertence a uma. */
  validity: { start: string | null; end: string | null } | null;
}

/**
 * O treino em PDF, no desenho do protocolo da dieta: cabeçalho da marca, o
 * exercício ocupando as linhas das suas séries e cada série com técnicas,
 * repetições, carga, RIR e blocos. Gerado no navegador, sem passar pelo servidor.
 *
 * @example exportWorkoutToPDF({ workout, studentName, professionalName, validity: null })
 */
export function exportWorkoutToPDF({
  workout,
  studentName,
  professionalName,
  validity,
}: WorkoutPdfInput): void {
  const sheet = buildWorkoutSheet(workout);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const top = drawBrandHeader(doc, {
    studentName,
    professionalName,
    caption: validity ? validityCaption(validity.start, validity.end) : null,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(sheet.title.toUpperCase(), 15, top - 3);

  autoTable(doc, {
    startY: top + 2,
    head: [["ORDEM / EXERCÍCIO", "SÉRIE", "PRESCRIÇÃO", "DESCANSO"]],
    body: sheet.exercises.flatMap(exerciseRows),
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [...PDF_COLORS.line],
      textColor: [...PDF_COLORS.text],
    },
    headStyles: { fillColor: [...PDF_COLORS.tableHead], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 50, fillColor: [...PDF_COLORS.shade], fontStyle: "bold" },
      1: { cellWidth: 35 },
      2: { cellWidth: 75 },
      3: { cellWidth: 20, halign: "center" },
    },
    margin: { left: 15, right: 15 },
  });

  drawProtocolFooter(doc);
  doc.save(protocolFileName(sheet.title, "Treino"));
}

/** O exercício ocupa as linhas das suas séries; a observação fecha o bloco. */
function exerciseRows(exercise: WorkoutSheetExercise): RowInput[] {
  const name = [
    `${String(exercise.order).padStart(2, "0")}. ${exercise.name.toUpperCase()}`,
    exercise.muscleGroup,
  ]
    .filter(Boolean)
    .join("\n");
  if (exercise.sets.length === 0) return [[name, "—", "Sem séries", "—"]];
  const rows: RowInput[] = exercise.sets.map((set, index) => [
    ...(index === 0
      ? [{ content: name, rowSpan: exercise.sets.length + (exercise.notes ? 1 : 0) }]
      : []),
    { content: [set.label, ...set.methods].join("\n") },
    { content: prescriptionText(set) },
    { content: set.rest ?? "—" },
  ]);
  if (exercise.notes) {
    rows.push([
      { content: `Obs.: ${exercise.notes}`, colSpan: 3, styles: { fontStyle: "italic" } },
    ]);
  }
  return rows;
}

// As fontes padrão do jsPDF só cobrem WinAnsi: a seta "→" sairia como lixo.
const ARROW = /→/g;

function prescriptionText(set: WorkoutSheetSet): string {
  const main = [set.reps, set.weight, set.rir].filter(Boolean).join(" · ");
  return [main, ...set.segments.map((segment) => segment.replace(ARROW, "»"))].join("\n");
}
