import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import type { Database } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AssessmentInsert = Database["public"]["Tables"]["physical_assessments"]["Insert"];

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
      const numeric: Record<string, number | null> = {};
      for (const [key, val] of Object.entries(measurements)) {
        numeric[key] = val !== null && val !== "" ? Number(val) : null;
      }

      const { data: latest } = await supabaseAdmin
        .from("physical_assessments")
        .select("id")
        .eq("student_id", studentId)
        .eq("specialist_id", caller.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        await supabaseAdmin
          .from("physical_assessments")
          // field mapping uses legacy names — tracked as tech debt in assessments module
          .update(numeric as unknown as AssessmentInsert)
          .eq("id", latest.id);
      } else {
        await supabaseAdmin
          .from("physical_assessments")
          // field mapping uses legacy names — tracked as tech debt in assessments module
          .insert({
            student_id: studentId,
            specialist_id: caller.id,
            ...numeric,
          } as unknown as AssessmentInsert);
      }
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
