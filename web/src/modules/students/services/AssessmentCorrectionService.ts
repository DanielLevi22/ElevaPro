import type { Database, Json } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface CorrectionRequest {
  assessmentId: string;
  studentId: string;
  actorId: string;
  expected: Json;
  changes: Json;
  traceId: string;
}

/** Retifica e preserva o conteúdo anterior atomicamente. Ex.: correctAssessment(request). */
export async function correctAssessment(input: CorrectionRequest) {
  return supabaseAdmin.rpc("correct_physical_assessment", {
    p_assessment_id: input.assessmentId,
    p_student_id: input.studentId,
    p_actor_id: input.actorId,
    p_expected: input.expected,
    p_changes: input.changes,
    p_trace_id: input.traceId,
  });
}

/** Consulta apenas as versões que a RLS autoriza. Ex.: readAssessmentRevisions(client, studentId, assessmentId). */
export async function readAssessmentRevisions(
  client: SupabaseClient<Database>,
  studentId: string,
  assessmentId: string,
) {
  return client
    .from("physical_assessment_revisions")
    .select("id, corrected_at, previous_values")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .order("corrected_at", { ascending: false });
}
