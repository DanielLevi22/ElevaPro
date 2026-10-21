import jsPDF from "jspdf";
import autoTable, { type CellInput, type RowInput } from "jspdf-autotable";
import { drawBrandHeader, drawProtocolFooter, protocolFileName, validityRange } from "./pdfBrand";

// Extend jsPDF type
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface DietPlan {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  plan_type: "unique" | "cyclic";
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
}

interface DietMeal {
  id: string;
  day_of_week: number | null;
  meal_type: string | null;
  meal_order: number;
  name?: string | null;
  meal_time?: string | null;
  meal_foods: DietMealItem[];
}

interface DietMealItem {
  id: string;
  quantity: number;
  unit: string;
  food: {
    name: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}

const _DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TRANSLATED_MEALS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
  pre_workout: "Pré-treino",
  post_workout: "Pós-treino",
  supper: "Ceia",
};

export async function exportDietToPDF(
  dietPlan: DietPlan,
  meals: DietMeal[],
  studentName: string,
  /** Nulo quando quem exporta é o próprio aluno: a linha não aparece. */
  professionalName: string | null,
) {
  // --- DATA CLEANING (GHOST MEAL PREVENTER) ---
  const activeMeals = meals.filter((m) => m.meal_foods && m.meal_foods.length > 0);

  const isCyclic = dietPlan.plan_type === "cyclic";
  const doc = new jsPDF({
    orientation: isCyclic ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const yPosition = drawBrandHeader(doc, {
    documentLabel: "PROTOCOLO NUTRICIONAL",
    studentName,
    professionalName,
    validity: validityRange(dietPlan.start_date, dietPlan.end_date),
  });

  // --- DATA PROCESSING (CLEANED & SEQUENCED) ---
  const mealsByDay = activeMeals.reduce(
    (acc, meal) => {
      const day = meal.day_of_week ?? 0;
      if (!acc[day]) acc[day] = [];
      acc[day].push(meal);
      return acc;
    },
    {} as Record<number, DietMeal[]>,
  );

  // Sort each day's meals
  Object.keys(mealsByDay).forEach((day) => {
    mealsByDay[Number(day)].sort(
      (a, b) => a.meal_order - b.meal_order || a.meal_time?.localeCompare(b.meal_time || "") || 0,
    );
  });

  if (isCyclic) {
    const maxMealsInADay = Math.max(...Object.values(mealsByDay).map((d) => d.length), 0);

    const tableHead: RowInput = [
      { content: "SEQUÊNCIA DO PROTOCOLO", styles: { halign: "left" as const } },
      "SEG",
      "TER",
      "QUA",
      "QUI",
      "SEX",
      "SÁB",
      "DOM",
    ];

    const tableBody = Array.from({ length: maxMealsInADay }).map((_, rowIndex) => {
      // Find the best possible label for this row across all days
      let rowLabel = `REFEIÇÃO ${rowIndex + 1}`;
      let rowTime = "";

      const rowMeals = [];
      for (let d = 0; d < 7; d++) {
        const m = mealsByDay[d]?.[rowIndex];
        if (m) rowMeals.push(m);
      }

      // 1. Try custom name
      const mWithName = rowMeals.find((m) => m.name && m.name.trim().length > 0);
      if (mWithName) {
        rowLabel = mWithName.name ?? "";
      } else {
        // 2. Try translation
        const mWithTranslation = rowMeals.find(
          (m) => m.meal_type && TRANSLATED_MEALS[m.meal_type.toLowerCase()],
        );
        if (mWithTranslation) {
          rowLabel = TRANSLATED_MEALS[(mWithTranslation.meal_type ?? "").toLowerCase()];
        }
      }

      // Time logic (from any day)
      const mWithTime = rowMeals.find((m) => m.meal_time);
      if (mWithTime) rowTime = `\n[ ${mWithTime.meal_time} ]`;

      const row: CellInput[] = [
        {
          content: `${rowLabel.toUpperCase()}${rowTime}`,
          styles: { fontStyle: "bold" as const, textColor: [40, 40, 40] },
        },
      ];

      for (let i = 1; i <= 7; i++) {
        const dayIdx = i % 7;
        const meal = mealsByDay[dayIdx]?.[rowIndex];

        if (meal && meal.meal_foods.length > 0) {
          const foodsText = meal.meal_foods
            .map((f) => `${f.food.name} (${f.quantity}${f.unit})`)
            .join("\n");
          row.push({ content: foodsText, styles: { textColor: [40, 40, 40] } });
        } else {
          row.push({ content: "---", styles: { textColor: [200, 200, 200] } });
        }
      }
      return row;
    });

    autoTable(doc, {
      startY: yPosition,
      head: [tableHead],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        overflow: "linebreak",
        halign: "center",
        valign: "middle",
        lineWidth: 0.1,
        lineColor: [230, 230, 230],
        textColor: [40, 40, 40], // Global table text color
      },
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 35, fillColor: [250, 250, 250], halign: "left", textColor: [40, 40, 40] },
      },
      margin: { left: 10, right: 10 },
    });
  } else {
    // PORTRAIT LIST
    const sortedDays = Object.keys(mealsByDay)
      .map(Number)
      .sort((a, b) => a - b);
    const dayMeals = mealsByDay[sortedDays[0] || 1] || [];

    const tableBody = dayMeals.map((meal) => {
      const foods = meal.meal_foods
        .map((f) => `• ${f.food.name} (${f.quantity}${f.unit})`)
        .join("\n");
      const cals = meal.meal_foods.reduce((s, f) => s + (f.food.calories ?? 0), 0).toFixed(0);
      const macros = `P: ${meal.meal_foods.reduce((s, f) => s + (f.food.protein ?? 0), 0).toFixed(1)}g\nC: ${meal.meal_foods.reduce((s, f) => s + (f.food.carbs ?? 0), 0).toFixed(1)}g\nG: ${meal.meal_foods.reduce((s, f) => s + (f.food.fat ?? 0), 0).toFixed(1)}g`;

      const label =
        meal.name || TRANSLATED_MEALS[(meal.meal_type ?? "").toLowerCase()] || "REFEIÇÃO";

      return [
        {
          content: `${label.toUpperCase()}\n[ ${meal.meal_time || "--:--"} ]`,
          styles: { fontStyle: "bold" as const, textColor: [40, 40, 40] },
        },
        { content: foods, styles: { textColor: [40, 40, 40] } },
        { content: `${cals} kcal`, styles: { halign: "center", textColor: [40, 40, 40] } },
        { content: macros, styles: { textColor: [40, 40, 40] } },
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [["ORDEM / HORÁRIO", "PRESCRIÇÃO NUTRICIONAL", "VALOR ENERGÉTICO", "MACRONUTRIENTES"]],
      body: tableBody as RowInput[],
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 5,
        valign: "middle",
        lineWidth: 0.1,
        textColor: [40, 40, 40],
      },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 40, fillColor: [252, 252, 252], textColor: [40, 40, 40] },
        1: { cellWidth: 90 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 30 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  drawProtocolFooter(doc);
  doc.save(protocolFileName(dietPlan.name, "Plano"));
}
