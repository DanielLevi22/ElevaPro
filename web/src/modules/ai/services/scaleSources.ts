import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScaleAssessment, ScaleCandidates } from "./escala";

/**
 * O que a Escala do Body scan lê do banco: a última medida do especialista, a
 * última declarada pelo aluno e a altura e o peso da anamnese.
 *
 * Um carregador só para as duas rotas que decidem a Escala (o portão e a análise):
 * com a leitura escrita em dois lugares, um passava a ver a medida declarada e o
 * outro não, e o portão liberava o que a análise recusava.
 */
export type ScaleSources = { ok: true; sources: ScaleCandidates } | { ok: false };

type MeasurementRow = { height_cm: number | string; weight_kg: number | string } | null;

/**
 * @example
 * const loaded = await loadScaleSources(client, userId);
 * if (!loaded.ok) return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });
 */
export async function loadScaleSources(
  client: SupabaseClient,
  studentId: string,
): Promise<ScaleSources> {
  const [specialist, declared, anamnese] = await Promise.all([
    latestMeasurement(client, studentId, "specialist"),
    latestMeasurement(client, studentId, "self"),
    // Os dois campos extraídos no banco: `responses` inteiro traria lesão e
    // medicação junto, para ler altura (Art. 6º, III).
    client
      .from("student_anamnesis")
      .select("responses->height, responses->weight")
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);
  if (specialist.error || declared.error || anamnese.error) return { ok: false };
  return {
    ok: true,
    sources: {
      specialistAssessment: toAssessment(specialist.data as MeasurementRow),
      declaredAssessment: toAssessment(declared.data as MeasurementRow),
      anamnese: anamnese.data as Record<string, unknown> | null,
    },
  };
}

function latestMeasurement(
  client: SupabaseClient,
  studentId: string,
  measuredBy: "specialist" | "self",
) {
  return client
    .from("physical_assessments")
    .select("height_cm, weight_kg")
    .eq("student_id", studentId)
    .eq("measured_by", measuredBy)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** O `numeric` do Postgres chega como texto pelo PostgREST. */
function toAssessment(row: MeasurementRow): ScaleAssessment | null {
  if (!row) return null;
  return { height_cm: Number(row.height_cm), weight_kg: Number(row.weight_kg) };
}
