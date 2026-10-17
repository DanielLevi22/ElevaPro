import { supabase } from "@elevapro/supabase";
import type { AssessmentRevision } from "../assessment-correction";

/** Lê as versões sob demanda, sem manter acervo sensível em cache. Ex.: fetchAssessmentRevisions(studentId, assessmentId, signal). */
export async function fetchAssessmentRevisions(
  studentId: string,
  assessmentId: string,
  signal: AbortSignal,
): Promise<AssessmentRevision[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");
  const response = await fetch(`/api/students/${studentId}/assessments/${assessmentId}`, {
    signal,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar as correções.");
  return (result as { revisions: AssessmentRevision[] }).revisions;
}
