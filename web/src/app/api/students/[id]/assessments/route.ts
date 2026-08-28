import type { Database } from "@elevapro/shared";
import { PHYSICAL_ASSESSMENT_COLUMNS } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AssessmentInsert = Database["public"]["Tables"]["physical_assessments"]["Insert"];

export interface Assessment {
  id: string;
  created_at: string;
  student_id: string;
  specialist_id: string;
  weight: number | null;
  height: number | null;
  notes: string | null;
  neck: number | null;
  shoulder: number | null;
  chest: number | null;
  arm_right_relaxed: number | null;
  arm_left_relaxed: number | null;
  arm_right_contracted: number | null;
  arm_left_contracted: number | null;
  forearm_right: number | null;
  forearm_left: number | null;
  waist: number | null;
  abdomen: number | null;
  hips: number | null;
  thigh_proximal_right: number | null;
  thigh_proximal_left: number | null;
  thigh_medial_right: number | null;
  thigh_medial_left: number | null;
  calf_right: number | null;
  calf_left: number | null;
  skinfold_chest: number | null;
  skinfold_abdominal: number | null;
  skinfold_thigh: number | null;
  skinfold_triceps: number | null;
  skinfold_suprailiac: number | null;
  skinfold_subscapular: number | null;
  skinfold_midaxillary: number | null;
}

const NUMERIC_FIELDS: Array<
  keyof Omit<Assessment, "id" | "created_at" | "student_id" | "specialist_id" | "notes">
> = [
  "weight",
  "height",
  "neck",
  "shoulder",
  "chest",
  "waist",
  "abdomen",
  "hips",
  "arm_right_relaxed",
  "arm_left_relaxed",
  "arm_right_contracted",
  "arm_left_contracted",
  "forearm_right",
  "forearm_left",
  "thigh_proximal_right",
  "thigh_proximal_left",
  "thigh_medial_right",
  "thigh_medial_left",
  "calf_right",
  "calf_left",
  "skinfold_chest",
  "skinfold_abdominal",
  "skinfold_thigh",
  "skinfold_triceps",
  "skinfold_suprailiac",
  "skinfold_subscapular",
  "skinfold_midaxillary",
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json({ assessments: data ?? [] });
  } catch (error) {
    console.error("[GET /api/students/:id/assessments]", error);
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
    const record: Record<string, unknown> = {
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
      // field mapping uses legacy names — tracked as tech debt in assessments module
      .insert(record as unknown as AssessmentInsert)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assessment: data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/students/:id/assessments]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
