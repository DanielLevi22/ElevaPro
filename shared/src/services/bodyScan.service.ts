import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BodyScanDelta,
  BodyScanInput,
  BodyScanRecord,
  ComparableField,
} from "../types/bodyScan.types";

/**
 * As colunas lidas em toda leitura de scan.
 *
 * Constante porque a lista aparecia literal em `list` e em
 * `latestWithComparison`: com 45 colunas, uma coluna nova entrando só numa das
 * duas produz um campo que existe numa tela e é `undefined` na outra, sem erro
 * de tipo — o `select` do Supabase é string. Mesmo motivo de
 * `PHYSICAL_ASSESSMENT_COLUMNS`.
 */
const BODY_SCAN_COLUMNS =
  "id, student_id, scanned_at, height_cm, weight_kg, body_fat_pct, lean_mass_kg, bmi, circ_chest, circ_waist, circ_hips, circ_arms, circ_thighs, circ_calves, circ_neck, circ_shoulders, posture_symmetry_score, posture_muscle_score, posture_overall_score, posture_feedback, recommendations, framing_mark_top, framing_mark_bottom, framing_pitch, framing_roll, framing_level_sensor, framing_camera, px_per_cm_front, px_per_cm_back, px_per_cm_side, shoulder_drop_cm, shoulder_tilt_deg, hip_drop_cm, hip_tilt_deg, axis_deviation_cm, trunk_rotated, plumb_shoulder_cm, plumb_hip_cm, plumb_knee_cm, quality_backlit, quality_low_light, quality_blown_out, framing_confirmed, created_at" as const;

const COMPARABLE_FIELDS: ComparableField[] = [
  "weight_kg",
  "body_fat_pct",
  "lean_mass_kg",
  "bmi",
  "circ_chest",
  "circ_waist",
  "circ_hips",
  "circ_arms",
  "circ_thighs",
  "circ_calves",
  "circ_neck",
  "circ_shoulders",
  "shoulder_drop_cm",
];

/**
 * Os dois scans saíram da mesma lente?
 *
 * Frontal e traseira têm distância focal diferente: o corpo ocupando a mesma
 * fração do quadro não significa a mesma distância, e a conversão px/cm muda
 * junto. O tipo já dizia que "escaneamentos de lentes diferentes não são
 * comparáveis" — a conta nunca conferiu, e a diferença entre duas lentes saía
 * como se fosse mudança no corpo, no número que a tela chama de mais confiável.
 *
 * Lente desconhecida também não passa. Não dá para afirmar que duas capturas
 * são comparáveis sem saber de onde vieram, e inventar essa afirmação é o que
 * produz o delta errado que ninguém consegue perceber.
 */
function mesmaLente(current: BodyScanRecord, previous: BodyScanRecord): boolean {
  // `== null` e não `=== null`: leitura com `select` mais estreito devolve
  // `undefined`, e comparar dois `undefined` daria "mesma lente" para duas
  // capturas das quais não sabemos nada.
  if (current.framing_camera == null || previous.framing_camera == null) return false;

  return current.framing_camera === previous.framing_camera;
}

/**
 * Diferença entre dois escaneamentos, campo a campo.
 *
 * É o número que a feature deve mostrar primeiro. Uma foto isolada dá uma
 * estimativa discutível; duas na mesma pose dão uma comparação confiável,
 * porque o erro sistemático se repete nas duas e se cancela na diferença
 * (`ADR-0010`).
 *
 * Campo nulo em qualquer um dos lados sai do resultado — "não medido" não é
 * zero, e tratá-lo como zero inventaria uma variação que não houve. `undefined`
 * conta como nulo pelo mesmo motivo: uma leitura com `select` mais estreito que
 * `BODY_SCAN_COLUMNS` produzia `NaN` em vez de sumir do resultado, e `NaN`
 * chega à tela parecendo uma medida.
 *
 * @example
 * const deltas = compareScans(scans[0], scans[1]);
 * // [{ field: 'circ_waist', current: 82, previous: 85, change: -3 }]
 */
export function compareScans(current: BodyScanRecord, previous: BodyScanRecord): BodyScanDelta[] {
  if (!mesmaLente(current, previous)) return [];

  const deltas: BodyScanDelta[] = [];

  for (const field of COMPARABLE_FIELDS) {
    const now = current[field];
    const before = previous[field];
    if (now == null || before == null) continue;

    deltas.push({
      field,
      current: now,
      previous: before,
      change: Number((now - before).toFixed(2)),
    });
  }

  return deltas;
}

export const createBodyScanService = (supabase: SupabaseClient) => ({
  /**
   * Grava uma análise. O `studentId` vem sempre do token de quem chamou —
   * nunca do corpo da requisição.
   */
  save: async (studentId: string, input: BodyScanInput): Promise<BodyScanRecord> => {
    const { data, error } = await supabase
      .from("body_scans")
      .insert({ student_id: studentId, ...input })
      .select()
      .single();

    if (error) throw error;
    return data as BodyScanRecord;
  },

  /**
   * Histórico, do mais recente para o mais antigo.
   *
   * A RLS da `0017` já limita a quem pode ler: o próprio aluno e o
   * especialista com vínculo ativo. Não há filtro de papel aqui de propósito —
   * duplicar a regra no cliente é onde as duas cópias divergem.
   */
  list: async (studentId: string, limit = 10): Promise<BodyScanRecord[]> => {
    const { data, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("body_scans")
      .select(BODY_SCAN_COLUMNS)
      .eq("student_id", studentId)
      .order("scanned_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as BodyScanRecord[]) ?? [];
  },

  /**
   * Apaga uma análise do próprio aluno — Art. 18, VI.
   *
   * Aqui não existe "corrigir": `body_scans` é medida derivada por IA, e o
   * remédio para uma medida inexata é medir de novo. O que o titular tem é o
   * direito de eliminar, e é este o caminho.
   *
   * Sem filtro de dono no `.eq()` de propósito: `body_scans_own` (migration
   * `0017`) já restringe à própria linha, e repetir a regra no cliente é onde
   * as duas cópias divergem. Um id de outro aluno simplesmente não casa com
   * nenhuma linha visível — apaga zero e não vaza a existência dela.
   *
   * @example
   * await bodyScanService.deleteOwn(scanId);
   */
  deleteOwn: async (scanId: string): Promise<void> => {
    const { error } = await supabase.from("body_scans").delete().eq("id", scanId);
    if (error) throw error;
  },

  /**
   * Último escaneamento e a comparação com o anterior, quando existe.
   *
   * `deltas` vem vazio no primeiro escaneamento — que é a resposta honesta:
   * não há com o que comparar ainda.
   */
  latestWithComparison: async (
    studentId: string,
  ): Promise<{
    latest: BodyScanRecord | null;
    previous: BodyScanRecord | null;
    deltas: BodyScanDelta[];
  }> => {
    const { data, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("body_scans")
      .select(BODY_SCAN_COLUMNS)
      .eq("student_id", studentId)
      .order("scanned_at", { ascending: false })
      .limit(2);

    if (error) throw error;

    const scans = (data as BodyScanRecord[]) ?? [];
    const latest = scans[0] ?? null;
    const previous = scans[1] ?? null;

    return {
      latest,
      previous,
      deltas: latest && previous ? compareScans(latest, previous) : [],
    };
  },
});
