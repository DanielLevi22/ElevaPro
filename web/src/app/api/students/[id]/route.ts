import {
  CIRCUMFERENCE_FIELDS,
  type PhysicalAssessmentInput,
  SKINFOLD_FIELDS,
} from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const body = await request.json();
    const { full_name, measurements } = body as {
      full_name?: string;
      measurements?: Record<string, string | number | null>;
    };

    // profiles only has: id, email, full_name, avatar_url, account_type, account_status, created_at
    if (full_name !== undefined) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ full_name })
        .eq("id", studentId);
      if (error) throw error;
    }

    // Upsert measurements into physical_assessments
    if (measurements && Object.values(measurements).some((v) => v !== null && v !== "")) {
      // O corpo da requisição não escolhe coluna. Só as chaves da ficha
      // passam; qualquer outra é descartada em vez de seguir para o banco.
      const camposPermitidos = new Set<string>([
        ...CIRCUMFERENCE_FIELDS.map((f) => f.key),
        ...SKINFOLD_FIELDS.map((f) => f.key),
        "weight_kg",
        "height_cm",
        "body_fat_pct",
        "muscle_mass_kg",
      ]);

      const numeric: PhysicalAssessmentInput = {};
      for (const [key, val] of Object.entries(measurements)) {
        if (!camposPermitidos.has(key)) continue;
        Object.assign(numeric, { [key]: val !== null && val !== "" ? Number(val) : null });
      }

      const { data: latest, error: lookupError } = await supabaseAdmin
        .from("physical_assessments")
        .select("id")
        .eq("student_id", studentId)
        .eq("specialist_id", caller.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      // Sem `as unknown as AssessmentInsert`. O cast existia para calar o tipo
      // gerado do schema — que teria acusado, um a um, os catorze nomes de
      // coluna que não existiam. Com ele fora, o compilador volta a ser a
      // guarda que impede esta rota de gravar em campo inventado.
      const { error: writeError } = latest
        ? await supabaseAdmin.from("physical_assessments").update(numeric).eq("id", latest.id)
        : await supabaseAdmin.from("physical_assessments").insert({
            student_id: studentId,
            specialist_id: caller.id,
            ...numeric,
          });

      // O resultado do insert e do update era descartado: a gravação falhava e
      // a rota respondia `success: true`.
      if (writeError) throw writeError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/students/:id]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    // Soft delete — status → inactive (preserva histórico)
    const { error } = await supabaseAdmin
      .from("student_specialists")
      .update({
        status: "inactive",
        ended_by: caller.id,
        ended_at: new Date().toISOString(),
      })
      .eq("specialist_id", caller.id)
      .eq("student_id", studentId)
      .eq("status", "active");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/students/:id]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
