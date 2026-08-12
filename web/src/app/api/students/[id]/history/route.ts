import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface HistoryEvent {
  id: string;
  type: "workout_session" | "physical_assessment" | "diet_plan";
  title: string;
  subtitle: string;
  date: string;
  status?: "completed" | "in_progress";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;

    const [sessionsResult, assessmentsResult, dietPlansResult] = await Promise.all([
      supabaseAdmin
        .from("workout_sessions")
        .select("id, started_at, completed_at, workout:workouts(title)")
        .eq("student_id", studentId)
        .order("started_at", { ascending: false })
        .limit(50),

      supabaseAdmin
        .from("physical_assessments")
        .select("id, created_at, weight_kg, height_cm")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50),

      supabaseAdmin
        .from("diet_plans")
        .select("id, name, created_at, status")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const events: HistoryEvent[] = [];

    for (const s of sessionsResult.data ?? []) {
      const workout = s.workout as unknown as { title: string } | null;
      events.push({
        id: s.id,
        type: "workout_session",
        title: workout?.title ?? "Treino",
        subtitle: s.completed_at ? "Treino concluído" : "Treino iniciado",
        date: s.started_at,
        status: s.completed_at ? "completed" : "in_progress",
      });
    }

    for (const a of assessmentsResult.data ?? []) {
      const detail = a.weight_kg ? `${a.weight_kg} kg` : "Medidas registradas";
      events.push({
        id: a.id,
        type: "physical_assessment",
        title: "Avaliação física",
        subtitle: detail,
        date: a.created_at,
      });
    }

    for (const p of dietPlansResult.data ?? []) {
      events.push({
        id: p.id,
        type: "diet_plan",
        title: p.name ?? "Plano alimentar",
        subtitle: p.status === "active" ? "Plano ativo" : "Plano encerrado",
        date: p.created_at,
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ events: events.slice(0, 100) });
  } catch (error) {
    console.error("[GET /api/students/:id/history]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
