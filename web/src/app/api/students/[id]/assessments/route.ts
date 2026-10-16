import type { Database } from "@elevapro/shared";
import {
  CIRCUMFERENCE_FIELDS,
  PHYSICAL_ASSESSMENT_COLUMNS,
  SKINFOLD_FIELDS,
} from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { attachTraceId, traceIdForRequest } from "@/lib/trace";

type AssessmentInsert = Database["public"]["Tables"]["physical_assessments"]["Insert"];

const NUMERIC_FIELDS = [
  ...CIRCUMFERENCE_FIELDS.map(({ key }) => key),
  ...SKINFOLD_FIELDS.map(({ key }) => key),
] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = traceIdForRequest(request);
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("physical_assessments")
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data?.length) {
      await recordSecurityAuditEvent({
        eventType: "health.assessment.read",
        outcome: "succeeded",
        actorId: auth.caller.id,
        subjectId: studentId,
        resourceType: "physical_assessment_collection",
        traceId,
      });
    }

    return attachTraceId(NextResponse.json({ assessments: data ?? [] }), traceId);
  } catch (error) {
    logger.error("students.assessments.read_failed", { error });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    const auth = await authorizeLinkedSpecialist(request, studentId);
    if (!auth.ok) return auth.response;
    const caller = auth.caller;

    const body = await request.json();
    const record: AssessmentInsert = {
      weight_kg: Number(body.weight_kg),
      height_cm: Number(body.height_cm),
      student_id: studentId,
      specialist_id: caller.id,
      notes: body.notes || null,
    };

    for (const field of NUMERIC_FIELDS) {
      const val = body[field];
      record[field] = val !== undefined && val !== "" && val !== null ? Number(val) : null;
    }

    const { data, error } = await supabaseAdmin
      .from("physical_assessments")
      .insert(record)
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
      .single();

    if (error) throw error;

    return NextResponse.json({ assessment: data }, { status: 201 });
  } catch (error) {
    logger.error("students.assessments.create_failed", { error });
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
